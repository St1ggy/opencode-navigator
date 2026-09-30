import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// @ts-expect-error The standalone Node installer has no TypeScript declaration.
import { updateLocalSnapshot } from '../scripts/update-local-snapshot.mjs'

const SOURCE_VERSION = '1.2.3'
const TARGET_VERSION = '1.2.4'

async function fixture(sourceVersion = SOURCE_VERSION) {
  const temporary = await mkdtemp(join(tmpdir(), 'navigator-snapshot-'))
  const root = join(temporary, 'opencode-navigator')
  const current = join(root, 'releases', `v${sourceVersion}`)
  const wrapper = join(root, 'tui.js')

  await mkdir(join(current, 'dist'), { recursive: true })
  await mkdir(join(current, 'node_modules', '@opentui', 'core'), { recursive: true })
  await mkdir(join(current, 'node_modules', '@opentui', 'solid'), { recursive: true })
  await mkdir(join(current, 'node_modules', 'solid-js'), { recursive: true })
  await writeFile(wrapper, `export { default } from "./releases/v${sourceVersion}/dist/tui.js";\n`)
  await writeFile(join(current, 'dist', 'tui.js'), 'export default { id: "opencode-navigator" };\n')
  await writeFile(join(current, 'CHANGELOG.md'), `## [${sourceVersion}]\n\n- Original.\n`)
  await writeFile(
    join(current, 'package.json'),
    JSON.stringify({
      version: sourceVersion,
      dependencies: { '@opentui/core': '0.5.12', '@opentui/solid': '0.5.12', 'solid-js': '1.9.15' },
    }),
  )

  return { temporary, root, current, wrapper, sourceVersion }
}

test('a confirmed pinned update stages a complete new snapshot and only then repoints the wrapper', async () => {
  const { temporary, root, current, wrapper } = await fixture()

  try {
    await updateLocalSnapshot(wrapper, TARGET_VERSION, {
      async stage(staging: string, version: string) {
        expect(await readFile(wrapper, 'utf8')).toContain(`v${SOURCE_VERSION}`)
        await mkdir(join(staging, 'dist'))
        await writeFile(join(staging, 'package.json'), JSON.stringify({ name: 'opencode-navigator', version }))
        await writeFile(join(staging, 'dist', 'tui.js'), 'export default { id: "opencode-navigator" };\n')
        await writeFile(join(staging, 'CHANGELOG.md'), `## [${version}]\n\n- Update.\n`)
      },
      async install(staging: string) {
        await mkdir(join(staging, 'node_modules', '@opentui', 'core'), { recursive: true })
        await mkdir(join(staging, 'node_modules', '@opentui', 'solid'), { recursive: true })
        await mkdir(join(staging, 'node_modules', 'solid-js'), { recursive: true })
      },
      async verify() {},
    })

    expect(await readFile(wrapper, 'utf8')).toContain(`./releases/v${TARGET_VERSION}/dist/tui.js`)
    expect(await readFile(join(current, 'CHANGELOG.md'), 'utf8')).toContain('Original')
    expect(await readFile(join(root, 'releases', `v${TARGET_VERSION}`, 'CHANGELOG.md'), 'utf8')).toContain('Update')
    expect((await readdir(join(root, 'releases'))).sort()).toEqual([`v${SOURCE_VERSION}`, `v${TARGET_VERSION}`])
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
})

test('failed or unrecognized pinned updates preserve the currently installed wrapper', async () => {
  const { temporary, root, wrapper } = await fixture()

  try {
    await expect(updateLocalSnapshot(wrapper, `../${TARGET_VERSION}`)).rejects.toThrow(
      'Invalid Navigator update version',
    )
    await expect(
      updateLocalSnapshot(wrapper, TARGET_VERSION, {
        async stage() {
          throw new Error('Download unavailable')
        },
      }),
    ).rejects.toThrow('Download unavailable')

    expect(await readFile(wrapper, 'utf8')).toContain(`v${SOURCE_VERSION}`)
    expect(await readdir(join(root, 'releases'))).toEqual([`v${SOURCE_VERSION}`])
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
})

const liveTest = process.env.NAVIGATOR_LIVE_SNAPSHOT_UPDATE === '1' ? test : test.skip

liveTest(
  'a registry package installs as an isolated snapshot without replacing its predecessor',
  async () => {
    const response = await fetch('https://registry.npmjs.org/opencode-navigator/latest')

    if (!response.ok) throw new Error('Could not resolve the published Navigator version')

    const { version } = (await response.json()) as { version: string }
    const { temporary, root, current, wrapper } = await fixture('0.0.0')

    try {
      await updateLocalSnapshot(wrapper, version)

      expect(await readFile(wrapper, 'utf8')).toContain(`./releases/v${version}/dist/tui.js`)
      expect(await readFile(join(current, 'CHANGELOG.md'), 'utf8')).toContain('Original')
      expect(await readFile(join(root, 'releases', `v${version}`, 'CHANGELOG.md'), 'utf8')).toContain(`## [${version}]`)
    } finally {
      await rm(temporary, { recursive: true, force: true })
    }
  },
  30_000,
)
