import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve as resolvePath } from 'node:path'

const metadata = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const root = resolvePath(import.meta.dirname, '..')
const artifacts = await mkdtemp(join(process.env.TMPDIR ?? tmpdir(), 'navigator-gui-smoke-'))
const image = `navigator-desktop-smoke:${metadata.devDependencies['@opencode/plugin']}-${process.arch}`
const container = `navigator-gui-smoke-${randomUUID()}`
const captureDirectory = process.env.NAVIGATOR_GUI_CAPTURE_DIR

if (captureDirectory) {
  if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('GUI captures are restricted to the manual CI workflow')

  await mkdir(captureDirectory, { recursive: true })
}

async function run(command, args, timeout = 300_000, capture = false) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  let output = ''

  try {
    await new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: root,
        signal: controller.signal,
        stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
      })

      child.stdout?.on('data', (data) => {
        output += data.toString()
      })
      child.once('error', reject)
      child.once('close', (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`))))
    })
  } finally {
    clearTimeout(timer)
  }

  return output
}

const pack = JSON.parse(
  await run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', artifacts], 120_000, true),
)[0]

console.log(`Isolated Desktop smoke artifacts: ${artifacts}`)
let completed = false

try {
  await run(
    'docker',
    [
      'build',
      '--build-arg',
      'MODE=release',
      '--build-arg',
      `DESKTOP_ARCH=${process.arch === 'arm64' ? 'arm64' : 'amd64'}`,
      '--build-arg',
      `DESKTOP_VERSION=${metadata.devDependencies['@opencode/plugin']}`,
      '-f',
      'test/gui/harness/Dockerfile',
      '-t',
      image,
      '.',
    ],
    900_000,
  )
  await run(
    'docker',
    [
      'run',
      '--name',
      container,
      '--rm',
      '--init',
      '--shm-size=1g',
      ...(captureDirectory
        ? [
            '--mount',
            `type=bind,src=${resolvePath(captureDirectory)},dst=/captures`,
            '-e',
            'NAVIGATOR_GUI_CAPTURE=1',
            '-e',
            'GITHUB_ACTIONS=true',
            '-e',
            'TZ=UTC',
          ]
        : []),
      '--mount',
      `type=bind,src=${join(artifacts, pack.filename)},dst=/input/navigator.tgz,readonly`,
      '-e',
      `NAVIGATOR_VERSION=${metadata.version}`,
      '-e',
      `NAVIGATOR_GUI_NATIVE_DIALOG_PROBE=${process.env.NAVIGATOR_GUI_NATIVE_DIALOG_PROBE ?? ''}`,
      '-e',
      `NAVIGATOR_GUI_QUOTA_FIXTURE=${process.env.NAVIGATOR_GUI_QUOTA_FIXTURE ?? ''}`,
      image,
    ],
    300_000,
  )
  completed = true
} finally {
  // Stop only this runner's uniquely named disposable container after a deadline/error.
  if (!completed) await run('docker', ['stop', '--time', '5', container], 15_000, true).catch(() => {})
}
