import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

test('isolated packaged Desktop blocks the live updater without masking host chrome', () => {
  const source = readFileSync('test/gui/harness/run.mjs', 'utf8')

  expect(source).toContain('--host-resolver-rules=MAP opencode.ai ~NOTFOUND')
  expect(source).toContain('Isolated Desktop unexpectedly reached the live host update service')
  expect(source).toContain("OPENCODE_DISABLE_AUTOUPDATE: 'true'")
  expect(source).not.toContain('--host-resolver-rules=MAP *')
})

test('reviewed Desktop capture inventory includes MCP switches and every Settings category', () => {
  const source = readFileSync('scripts/capture-gui-screenshots.mjs', 'utf8')

  for (const name of [
    '32-desktop-mcp-switches',
    '33-desktop-settings-layout',
    '33-desktop-settings-behavior',
    '33-desktop-settings-quick-actions',
    '33-desktop-settings-skills',
    '33-desktop-settings-mcp',
    '33-desktop-settings-presets',
    '33-desktop-settings-about',
  ])
    expect(source).toContain(`'${name}'`)
})

test('Settings captures use the visible Desktop viewport instead of a clipped overflowing element', () => {
  const source = readFileSync('test/gui/harness/settings-geometry.mjs', 'utf8')

  expect(source).toMatch(/captureGui\(\s*page\s*,/u)
  expect(source).not.toContain("captureGui(page.locator('[data-navigator-settings]')")
})

test('MCP capture shows production row state before exercising the synthetic information callback', () => {
  const source = readFileSync('test/gui/harness/mcp.mjs', 'utf8')
  const capture = source.indexOf("await captureGui(dialog, '32-desktop-mcp-switches')")
  const information = source.indexOf('await information.click()')

  expect(capture).toBeGreaterThan(0)
  expect(information).toBeGreaterThan(capture)
})
