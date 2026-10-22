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
  const optionalDependencies = { '@github/copilot-sdk': '1.2.3' }

  try {
    await updateLocalSnapshot(wrapper, TARGET_VERSION, {
      async stage(staging: string, version: string) {
        expect(await readFile(wrapper, 'utf8')).toContain(`v${SOURCE_VERSION}`)
        await mkdir(join(staging, 'dist'))
        await writeFile(
          join(staging, 'package.json'),
          JSON.stringify({ name: 'opencode-navigator', version, optionalDependencies }),
        )
        await writeFile(join(staging, 'dist', 'tui.js'), 'export default { id: "opencode-navigator" };\n')
        await writeFile(join(staging, 'CHANGELOG.md'), `## [${version}]\n\n`)
      },
      async install(staging: string) {
        const metadata = JSON.parse(await readFile(join(staging, 'package.json'), 'utf8'))

        expect(metadata.optionalDependencies).toEqual(optionalDependencies)
        expect(metadata.dependencies).toEqual(
          JSON.parse(await readFile(join(current, 'package.json'), 'utf8')).dependencies,
        )
        await mkdir(join(staging, 'node_modules', '@opentui', 'core'), { recursive: true })
        await mkdir(join(staging, 'node_modules', '@opentui', 'solid'), { recursive: true })
        await mkdir(join(staging, 'node_modules', 'solid-js'), { recursive: true })
      },
      async verify() {},
    })

    expect(await readFile(wrapper, 'utf8')).toContain(`./releases/v${TARGET_VERSION}/dist/tui.js`)
    expect(await readFile(join(current, 'CHANGELOG.md'), 'utf8')).toContain('Original')
    expect(await readFile(join(root, 'releases', `v${TARGET_VERSION}`, 'CHANGELOG.md'), 'utf8')).toContain(
      `## [${TARGET_VERSION}]`,
    )
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

test('a target runtime manifest advances dependencies without changing the predecessor', async () => {
  const { temporary, root, current, wrapper } = await fixture()
  const dependencies = Object.fromEntries(
    ['@opencode/plugin', '@opentui/core', '@opentui/keymap', '@opentui/solid', 'solid-js'].map((name) => [
      name,
      '1.2.7',
    ]),
  )

  try {
    // A predecessor installed by the old updater may declare newer pins than
    // its installed metadata. Updating it must repair the target, not get stuck.
    await writeFile(join(current, 'dist', 'runtime-dependencies.json'), JSON.stringify({ version: 1, dependencies }))
    await updateLocalSnapshot(wrapper, TARGET_VERSION, {
      async stage(staging: string) {
        await mkdir(join(staging, 'dist'))
        await writeFile(
          join(staging, 'package.json'),
          JSON.stringify({ name: 'opencode-navigator', version: TARGET_VERSION }),
        )
        await writeFile(join(staging, 'dist', 'tui.js'), 'export default { id: "opencode-navigator" };\n')
        await writeFile(
          join(staging, 'dist', 'runtime-dependencies.json'),
          JSON.stringify({ version: 1, dependencies }),
        )
        await writeFile(join(staging, 'CHANGELOG.md'), `## [${TARGET_VERSION}]\n`)
      },
      async install(staging: string) {
        expect(JSON.parse(await readFile(join(staging, 'package.json'), 'utf8')).dependencies).toEqual(dependencies)
        for (const name of ['@opentui/core', '@opentui/solid', 'solid-js'])
          await mkdir(join(staging, 'node_modules', name), { recursive: true })
      },
      async verify() {},
    })

    expect(await readFile(wrapper, 'utf8')).toContain(`v${TARGET_VERSION}`)
    expect(JSON.parse(await readFile(join(current, 'package.json'), 'utf8')).dependencies).not.toEqual(dependencies)
    expect((await readdir(join(root, 'releases'))).sort()).toEqual([`v${SOURCE_VERSION}`, `v${TARGET_VERSION}`])
    const targetMetadataPath = join(root, 'releases', `v${TARGET_VERSION}`, 'package.json')
    const targetMetadata = JSON.parse(await readFile(targetMetadataPath, 'utf8'))

    targetMetadata.dependencies['@opentui/core'] = '0.0.1'
    await writeFile(targetMetadataPath, JSON.stringify(targetMetadata))
    await writeFile(wrapper, `export { default } from "./releases/v${SOURCE_VERSION}/dist/tui.js";\n`)
    await expect(updateLocalSnapshot(wrapper, TARGET_VERSION)).rejects.toThrow('mismatched runtime dependencies')
    expect(await readFile(wrapper, 'utf8')).toContain(`v${SOURCE_VERSION}`)
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
})

test.each([
  { version: 2, dependencies: {} },
  { version: 1, dependencies: { 'arbitrary-package': '1.2.3' } },
  { version: 1, dependencies: { '@opentui/core': 'https://example.test/runtime.tgz' } },
])('an invalid target runtime manifest never installs or switches the active snapshot: %j', async (manifest) => {
  const { temporary, root, wrapper } = await fixture()
  let installs = 0

  try {
    await expect(
      updateLocalSnapshot(wrapper, TARGET_VERSION, {
        async stage(staging: string) {
          await mkdir(join(staging, 'dist'))
          await writeFile(
            join(staging, 'package.json'),
            JSON.stringify({ name: 'opencode-navigator', version: TARGET_VERSION }),
          )
          await writeFile(join(staging, 'dist', 'runtime-dependencies.json'), JSON.stringify(manifest))
        },
        async install() {
          installs++
        },
      }),
    ).rejects.toThrow('invalid runtime dependency manifest')
    expect(installs).toBe(0)
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
