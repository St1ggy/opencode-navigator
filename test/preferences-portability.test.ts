import { describe, expect, test } from 'bun:test'

import { PORTABLE_SETTINGS_FORMAT, parsePortableSettings, serializePortableSettings } from '../src/entities/preferences'

import type { SidebarSection } from '../src/state'

const layout = {
  sections: { todo: true, skills: false },
  expanded: { todo: true, mcp: false },
  order: ['mcp', 'todo', 'subagents', 'skills', 'quick_actions', 'lsp'] as SidebarSection[],
}

describe('portable settings', () => {
  test('serializes deterministic versioned layout and MCP settings', () => {
    const source = serializePortableSettings(layout, { wiki: 'disabled', context7: 'enabled' })

    expect(source.endsWith('\n')).toBe(true)
    expect(JSON.parse(source)).toEqual({
      format: PORTABLE_SETTINGS_FORMAT,
      version: 1,
      layout,
      mcp: { context7: 'enabled', wiki: 'disabled' },
    })
  })

  test('keeps supported values and reports future fields without accepting them', () => {
    const result = parsePortableSettings(
      JSON.stringify({
        format: PORTABLE_SETTINGS_FORMAT,
        version: 1,
        layout: {
          sections: { todo: false, agents: true },
          expanded: { mcp: true },
          order: ['agents', 'mcp', 'todo'],
          density: 'wide',
        },
        mcp: { future: 'enabled' },
        behavior: {},
      }),
    )

    expect(result.settings.layout).toEqual({
      sections: { todo: false },
      expanded: { mcp: true },
      order: ['mcp', 'todo', 'subagents', 'skills', 'quick_actions', 'lsp'],
    })
    expect(result.settings.mcp).toEqual({ future: 'enabled' })
    expect(result.unsupported).toEqual(['/behavior', '/layout/density', '/layout/order/0', '/layout/sections/agents'])
  })

  test('supports partial and explicit empty imports', () => {
    expect(
      parsePortableSettings(JSON.stringify({ format: PORTABLE_SETTINGS_FORMAT, version: 1, mcp: {} })).settings,
    ).toEqual({ format: PORTABLE_SETTINGS_FORMAT, version: 1, mcp: {} })
  })

  test('blocks malformed, future, duplicate, and invalid known values', () => {
    expect(() => parsePortableSettings('{')).toThrow('Malformed settings JSON')
    expect(() =>
      parsePortableSettings(JSON.stringify({ format: PORTABLE_SETTINGS_FORMAT, version: 2, mcp: {} })),
    ).toThrow('Unsupported settings version 2')
    expect(() =>
      parsePortableSettings(
        JSON.stringify({ format: PORTABLE_SETTINGS_FORMAT, version: 1, layout: { sections: { todo: 'yes' } } }),
      ),
    ).toThrow('/layout/sections/todo must be a boolean')
    expect(() =>
      parsePortableSettings(
        JSON.stringify({ format: PORTABLE_SETTINGS_FORMAT, version: 1, layout: { order: ['todo', 'todo'] } }),
      ),
    ).toThrow('duplicates todo')
    expect(() =>
      parsePortableSettings(JSON.stringify({ format: PORTABLE_SETTINGS_FORMAT, version: 1, mcp: { wiki: 'maybe' } })),
    ).toThrow('/mcp/wiki must be enabled or disabled')
  })
})
