import solid from '@st1ggy/linter-config/solid-ox'
import { expect, test } from 'bun:test'

import formatter from '../oxfmt.config'
import config from '../oxlint.config'
import metadata from '../package.json'

test('the published preset is extended intact with type-aware checks and all JS plugins', () => {
  expect(config.extends).toEqual([solid])
  const plugins = solid.jsPlugins?.map((plugin) => (typeof plugin === 'string' ? plugin : plugin.name))

  expect(plugins).toContain('sonarjs')
  expect(plugins).toContain('typescript-js')
  expect(plugins).toContain('solid')
  const rules = Object.assign({}, ...solid.overrides!.map((override) => override.rules))

  expect(rules['typescript/no-floating-promises']).toEqual([2])
  expect(rules['typescript/no-misused-promises']).toEqual([2])
  expect(rules['eslint/eqeqeq']).toBeDefined()
  expect(rules['sonarjs/no-dead-store']).toBeDefined()
  expect(config.options?.typeAware).toBe(true)
})

test('the resolved graph uses the preset-compatible TypeScript 6 compiler without TS7 overrides', async () => {
  const lock = Bun.JSONC.parse(await Bun.file(new URL('../bun.lock', import.meta.url)).text()) as {
    packages: Record<string, [string]>
  }
  const versions = Object.values(lock.packages)
    .filter(([name]) => name.startsWith('typescript@'))
    .map(([name]) => name.slice('typescript@'.length))

  expect(metadata.devDependencies.typescript).toMatch(/^6\./u)
  expect(versions).toEqual([metadata.devDependencies.typescript])
  expect('overrides' in metadata).toBe(false)
})

test('the lint engines honor the published preset exact peer contracts', async () => {
  const preset = await Bun.file('node_modules/@st1ggy/linter-config/package.json').json()

  for (const name of ['oxlint', 'oxfmt', 'oxlint-tsgolint'] as const)
    expect(metadata.devDependencies[name]).toBe(preset.peerDependencies[name])
})

test('the shared formatter sorts declarations without reordering side-effect imports', async () => {
  expect(typeof formatter.sortImports === 'object' && formatter.sortImports.sortSideEffects).toBe(false)
  const source =
    'import "./z-init"\nimport "./a-init"\nimport { z } from "z-lib"\nimport { a } from "a-lib"\nexport { a, z }\n'
  const child = Bun.spawn(['node_modules/.bin/oxfmt', '--stdin-filepath', 'sort-fixture.ts'], {
    stdin: new TextEncoder().encode(source),
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const text = await new Response(child.stdout).text()

  expect(await child.exited).toBe(0)
  expect(text.indexOf("'a-lib'")).toBeLessThan(text.indexOf("'z-lib'"))
  expect(text.indexOf("'./z-init'")).toBeLessThan(text.indexOf("'./a-init'"))
})
