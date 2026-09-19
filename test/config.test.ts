import { expect, test } from 'bun:test'

import { pluginConfig } from '../src/config'

test('parses focus_key and supplies its built-in default', () => {
  expect(pluginConfig(undefined).focusKey).toBe('ctrl+shift+f')
  expect(pluginConfig({ focus_key: ' alt+f ' }).focusKey).toBe('alt+f')
  expect(pluginConfig({ focus_key: ' ' }).focusKey).toBe('ctrl+shift+f')
})

test('search shortcut has a configurable default', () => {
  expect(pluginConfig(undefined).searchKey).toBe('ctrl+shift+k')
  expect(pluginConfig({ search_key: ' alt+y ' }).searchKey).toBe('alt+y')
  expect(pluginConfig({ search_key: ' ' }).searchKey).toBe('ctrl+shift+k')
})

test('global icon style accepts the legacy LSP option and gives the new option precedence', () => {
  expect(pluginConfig({ icon_style: 'text' }).lspIconStyle).toBe('text')
  expect(pluginConfig({ lsp_icon_style: 'text' }).lspIconStyle).toBe('text')
  expect(pluginConfig({ icon_style: 'nerd', lsp_icon_style: 'text' }).lspIconStyle).toBe('nerd')
  expect(pluginConfig({ icon_style: 'invalid', lsp_icon_style: 'text' }).lspIconStyle).toBe('text')
})

test('defaults to unlimited lists and sanitizes per-section limits', () => {
  expect(pluginConfig(undefined).sectionItemLimits).toEqual({})
  expect(
    pluginConfig({ section_item_limits: { todo: 0, skills: 5, mcp: -1, lsp: 1.5, subagents: '3', unknown: 4 } })
      .sectionItemLimits,
  ).toEqual({ todo: 0, skills: 5 })
})
