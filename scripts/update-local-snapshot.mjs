import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { snapshotRuntime } from './snapshot-runtime.mjs'
import { snapshotVerifier } from './snapshot-verifier.mjs'

function command(program, args, capture = false) {
  return new Promise((resolveCommand, reject) => {
    const child = spawn(program, args, { stdio: ['ignore', capture ? 'pipe' : 'ignore', 'pipe'] })
    let error = ''
    let output = ''

    child.stdout?.setEncoding('utf8')
    child.stdout?.on('data', (chunk) => (output += chunk))

    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk) => (error += chunk))
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolveCommand(output.trim())
      else reject(new Error(error.trim() || `${program} exited with code ${code}`))
    })
  })
}

export function pinnedSnapshot(wrapper, read = readFile) {
  if (basename(wrapper) !== 'tui.js' || basename(dirname(wrapper)) !== 'opencode-navigator')
    throw new Error('This local Navigator source is not a recognized pinned snapshot')

  return read(wrapper, 'utf8').then((source) => {
    const match = /^export \{ default \} from "\.\/releases\/v(\d+\.\d+\.\d+)\/dist\/tui\.js";\s*$/.exec(source)

    if (!match) throw new Error('This local Navigator source is not a recognized pinned snapshot')

    return { root: dirname(wrapper), version: match[1], source }
  })
}

async function validate(directory, version, { checkRuntime = true } = {}) {
  const metadata = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))

  if (
    metadata.version !== version ||
    !existsSync(join(directory, 'dist', 'tui.js')) ||
    !existsSync(join(directory, 'node_modules', '@opentui', 'core')) ||
    !existsSync(join(directory, 'node_modules', '@opentui', 'solid')) ||
    !existsSync(join(directory, 'node_modules', 'solid-js'))
  )
    throw new Error(`Snapshot ${version} is incomplete`)

  const changelog = await readFile(join(directory, 'CHANGELOG.md'), 'utf8')

  if (!changelog.includes(`## [${version}]`)) throw new Error(`Snapshot ${version} has no bundled changelog entry`)

  // Older installers inherited the predecessor's pins even when a new package
  // declared a runtime manifest. Accept that running source; verify the target.
  if (!checkRuntime) return

  const runtime = await snapshotRuntime(directory, metadata.dependencies)

  if (runtime && Object.entries(runtime).some(([name, pinned]) => metadata.dependencies?.[name] !== pinned))
    throw new Error(`Snapshot ${version} has mismatched runtime dependencies`)
}

async function verifySnapshot(directory, runtime) {
  const verifier = runtime ?? (await snapshotVerifier(directory, (program) => command(program, ['--version'], true)))
  const importURL = JSON.stringify(pathToFileURL(join(directory, 'dist', 'tui.js')).href)

  await command(verifier, [
    '--input-type=module',
    '--eval',
    `const plugin=(await import(${importURL})).default;if(plugin?.id!=='opencode-navigator')throw Error('Invalid Navigator plugin bundle')`,
  ])
}

export async function updateLocalSnapshot(wrapper, target, operations = {}) {
  if (!/^\d+\.\d+\.\d+$/.test(target)) throw new Error('Invalid Navigator update version')

  const { root, version, source } = await pinnedSnapshot(resolve(wrapper))
  const previous = join(root, 'releases', `v${version}`)
  const next = join(root, 'releases', `v${target}`)

  if (target === version) return

  await validate(previous, version, { checkRuntime: false })
  const previousMetadata = JSON.parse(await readFile(join(previous, 'package.json'), 'utf8'))
  const dependencies = previousMetadata.dependencies

  if (!dependencies?.['@opentui/core'] || !dependencies['@opentui/solid'] || !dependencies['solid-js'])
    throw new Error('Pinned Navigator runtime dependencies are missing')

  const staging = join(root, 'releases', `.v${target}-${randomUUID()}.tmp`)
  const replacement = join(root, `.tui-${randomUUID()}.tmp`)

  try {
    if (existsSync(next)) {
      await validate(next, target)

      await (operations.verify ? operations.verify(next) : verifySnapshot(next))
    } else {
      await mkdir(staging)

      if (operations.stage) await operations.stage(staging, target)
      else {
        await command('npm', ['pack', `opencode-navigator@${target}`, '--pack-destination', staging, '--silent'])
        await command('tar', [
          '-xzf',
          join(staging, `opencode-navigator-${target}.tgz`),
          '-C',
          staging,
          '--strip-components=1',
        ])
        await rm(join(staging, `opencode-navigator-${target}.tgz`))
      }

      const metadata = JSON.parse(await readFile(join(staging, 'package.json'), 'utf8'))

      if (metadata.name !== 'opencode-navigator' || metadata.version !== target)
        throw new Error('Downloaded Navigator package does not match the requested version')

      const verifier = operations.verify
        ? undefined
        : await snapshotVerifier(staging, (runtime) => command(runtime, ['--version'], true))

      await writeFile(
        join(staging, 'package.json'),
        JSON.stringify({
          name: 'opencode-navigator-local-snapshot',
          version: target,
          private: true,
          type: 'module',
          dependencies: await snapshotRuntime(staging, dependencies),
          optionalDependencies: { ...previousMetadata.optionalDependencies, ...metadata.optionalDependencies },
        }),
      )

      await (operations.install
        ? operations.install(staging)
        : command('npm', [
            'install',
            '--prefix',
            staging,
            '--omit=dev',
            '--ignore-scripts',
            '--no-package-lock',
            '--legacy-peer-deps',
          ]))

      await validate(staging, target)

      await (operations.verify ? operations.verify(staging) : verifySnapshot(staging, verifier))

      await rename(staging, next)
    }

    if ((await readFile(wrapper, 'utf8')) !== source)
      throw new Error('Navigator source changed during the update; restart OpenCode and retry')

    await writeFile(replacement, `export { default } from "./releases/v${target}/dist/tui.js";\n`)
    await rename(replacement, wrapper)
  } finally {
    await rm(staging, { recursive: true, force: true })
    await rm(replacement, { force: true })
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    await updateLocalSnapshot(process.argv[2], process.argv[3])
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
