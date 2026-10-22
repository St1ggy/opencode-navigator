import { expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'

import metadata from '../package.json' with { type: 'json' }

test('the built package declares its exact target snapshot runtime and ships the installer helper', async () => {
  const manifest = JSON.parse(await readFile(new URL('../dist/runtime-dependencies.json', import.meta.url), 'utf8'))
  const names = ['@opencode/plugin', '@opentui/core', '@opentui/keymap', '@opentui/solid', 'solid-js'] as const

  expect(manifest).toEqual({
    version: 1,
    dependencies: Object.fromEntries(names.map((name) => [name, metadata.devDependencies[name]])),
  })
  expect(metadata.files).toContain('dist')
  expect(metadata.files).toContain('scripts/snapshot-runtime.mjs')
})

test('the packaged shortcut and keyboard-help entrypoint imports from its declared flat path', async () => {
  const views = await import(new URL('../dist/sidebar-shortcuts.js', import.meta.url).href)

  expect(typeof views.default).toBe('function')
  expect(typeof views.KeyboardHelpDialog).toBe('function')
})
