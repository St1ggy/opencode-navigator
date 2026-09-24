import { describe, expect, test } from 'bun:test'

import {
  type PreferencesDocument,
  parsePreferencesDocument,
  preferencesScope,
  resolvePreferences,
} from '../src/preferences-schema'
import { QUICK_ACTION_IDS } from '../src/quick-actions'

import type { SidebarSection } from '../src/state'

const builtIns = {
  behavior: {
    toggleKey: 'ctrl+shift+b',
    focusKey: 'ctrl+shift+f',
    searchKey: 'ctrl+shift+k',
    persistMcp: true,
    cornerFont: true,
    lspIconStyle: 'nerd' as const,
    rowDensity: 'compact' as const,
    sectionItemLimits: {},
    quickActionOrder: [...QUICK_ACTION_IDS],
    quickActionVisibility: {},
  },
  layout: {
    sections: {
      todo: true,
      subagents: true,
      skills: true,
      quick_actions: true,
      lsp: true,
      mcp: true,
    },
    expanded: {
      todo: true,
      subagents: false,
      skills: false,
      quick_actions: false,
      lsp: false,
      mcp: false,
    },
    order: ['todo', 'subagents', 'skills', 'quick_actions', 'lsp', 'mcp'] as SidebarSection[],
  },
  desiredMcpStates: {},
}

describe('preferences schema', () => {
  test('keys worktree preferences by exact worktree with directory and global fallbacks', () => {
    expect(preferencesScope({ worktree: '/repo', directory: '/repo/packages/app' })).toBe('/repo')
    expect(preferencesScope({ directory: '/tmp/project' })).toBe('/tmp/project')
    expect(preferencesScope({})).toBe('global')
  })

  test('sanitizes every durable leaf and drops unknown data', () => {
    expect(
      parsePreferencesDocument({
        global: {
          behavior: {
            toggleKey: ' alt+s ',
            focusKey: ' ',
            persistMcp: false,
            cornerFont: false,
            lspIconStyle: 'invalid',
            rowDensity: 'comfortable',
            unknown: true,
          },
          layout: {
            sections: { todo: false, skills: 'no' },
            expanded: { skills: true, unknown: true },
            order: ['mcp', 'todo', 'mcp', 'unknown'],
          },
          mcp: { global: 'enabled' },
        },
        worktrees: {
          '/repo': {
            behavior: { focusKey: 'alt+w', rowDensity: 'compact' },
            layout: { sections: { mcp: false }, expanded: {}, order: ['skills', 'todo'] },
            mcp: { wiki: 'disabled', context7: 'enabled', bad: 'maybe' },
          },
          invalid: 'no',
        },
        user: {
          skippedSkillConfirmations: ['/skills/review', 42, '/skills/review'],
          onboardingCompleted: true,
          layoutPresets: {
            ' Focus ': {
              sections: { skills: false, unknown: true },
              expanded: { todo: false },
              order: ['mcp', 'todo', 'mcp', 'unknown'],
            },
            Empty: {},
          },
          mcpPresets: {
            ' Work ': { wiki: 'disabled', context7: 'enabled', bad: 'maybe' },
            Empty: {},
          },
          favoriteSkills: ['/skills/review', 42, '/skills/review', '/skills/commit'],
          favoriteMcpServers: ['wiki', 42, 'wiki', '', 'context7'],
          favoriteQuickActions: ['session.export', 'unknown', 'session.rename', 'session.export'],
          mcpServerGroups: { wiki: ' Docs ', context7: '', ' ': 'Invalid', invalid: 42 },
          workspaceProfiles: { ' Focus ': ' Work ', Empty: '', Invalid: 42 },
          unknown: true,
        },
        unknown: true,
      }),
    ).toEqual({
      global: {
        behavior: { toggleKey: 'alt+s', persistMcp: false, cornerFont: false, rowDensity: 'comfortable' },
        layout: {
          sections: { todo: false },
          expanded: { skills: true },
          order: ['mcp', 'todo', 'subagents', 'skills', 'quick_actions', 'lsp'],
        },
        mcp: { global: 'enabled' },
      },
      worktrees: {
        '/repo': {
          behavior: { focusKey: 'alt+w', rowDensity: 'compact' },
          layout: {
            sections: { mcp: false },
            expanded: {},
            order: ['skills', 'todo', 'subagents', 'quick_actions', 'lsp', 'mcp'],
          },
          mcp: { context7: 'enabled', wiki: 'disabled' },
        },
      },
      user: {
        skippedSkillConfirmations: ['/skills/review'],
        onboardingCompleted: true,
        layoutPresets: {
          Focus: {
            sections: { skills: false },
            expanded: { todo: false },
            order: ['mcp', 'todo', 'subagents', 'skills', 'quick_actions', 'lsp'],
          },
        },
        mcpPresets: { Work: { context7: 'enabled', wiki: 'disabled' } },
        favoriteSkills: ['/skills/commit', '/skills/review'],
        favoriteMcpServers: ['context7', 'wiki'],
        favoriteQuickActions: ['session.rename', 'session.export'],
        mcpServerGroups: { wiki: 'Docs' },
        workspaceProfiles: { Focus: 'Work' },
      },
    } satisfies PreferencesDocument)
  })

  test('rejects structurally malformed documents', () => {
    expect(() => parsePreferencesDocument([])).toThrow('Invalid preferences document')
    expect(() => parsePreferencesDocument(null)).toThrow('Invalid preferences document')
  })

  test('recent skills preserve recency rather than sorting locations', () => {
    expect(parsePreferencesDocument({ user: { recentSkills: ['/z', '', 1, '/a', '/z'] } }).user.recentSkills).toEqual([
      '/z',
      '/a',
    ])
  })

  test('recent quick actions preserve valid IDs in recency order', () => {
    expect(
      parsePreferencesDocument({
        user: { recentQuickActions: ['session.export', 'unknown', 'session.rename', 'session.export'] },
      }).user.recentQuickActions,
    ).toEqual(['session.export', 'session.rename'])
  })

  test('sanitizes MCP group assignments while preserving exact server names', () => {
    expect(
      parsePreferencesDocument({
        user: { mcpServerGroups: { 'review server': ' Review ', 'review-server': 'x'.repeat(100) } },
      }).user.mcpServerGroups,
    ).toEqual({ 'review server': 'Review', 'review-server': 'x'.repeat(64) })
  })

  test('sanitizes workspace profile links without requiring referenced presets to exist', () => {
    expect(
      parsePreferencesDocument({ user: { workspaceProfiles: { ' Focus ': ' Docs ', Empty: '', Invalid: 42 } } }).user
        .workspaceProfiles,
    ).toEqual({ Focus: 'Docs' })
  })

  test('merges list limits leaf-wise and allows explicit unlimited overrides', () => {
    const result = resolvePreferences({
      builtIns,
      pluginOptions: { behavior: { sectionItemLimits: { todo: 2, skills: 5 } } },
      global: { behavior: { sectionItemLimits: { todo: 3, mcp: 8 } } },
      worktree: { behavior: { sectionItemLimits: { todo: 0 } } },
    })

    expect(result.behavior.sectionItemLimits).toEqual({ todo: 0, skills: 5, mcp: 8 })
    expect(
      parsePreferencesDocument({
        global: { behavior: { sectionItemLimits: { todo: Infinity, skills: NaN, mcp: -1 } } },
      }).global,
    ).toEqual({})
  })

  test('normalizes MCP preset names case-insensitively', () => {
    const presets = parsePreferencesDocument({
      user: { mcpPresets: { Work: { wiki: 'enabled' }, work: { wiki: 'disabled' } } },
    }).user.mcpPresets

    expect(Object.keys(presets ?? {})).toHaveLength(1)
  })

  test('resolves supported values leaf-wise in session, worktree, global, option, built-in order', () => {
    expect(
      resolvePreferences({
        builtIns,
        pluginOptions: {
          behavior: { toggleKey: 'alt+o', focusKey: 'alt+f' },
          layout: { sections: { todo: false, lsp: false } },
          desiredMcpStates: { wiki: 'enabled', optionOnly: 'disabled' },
        },
        global: {
          behavior: { persistMcp: false, rowDensity: 'comfortable' },
          layout: { sections: { lsp: true }, expanded: { skills: true } },
          desiredMcpStates: { wiki: 'disabled' },
        },
        worktree: {
          behavior: { focusKey: 'ctrl+w' },
          layout: { order: ['mcp', 'todo'] },
          desiredMcpStates: { wiki: 'enabled', context7: 'disabled' },
        },
        session: {
          behavior: { toggleKey: 'ctrl+s' },
          layout: { expanded: { skills: false } },
          desiredMcpStates: { context7: 'enabled' },
        },
      }),
    ).toEqual({
      behavior: {
        toggleKey: 'ctrl+s',
        focusKey: 'ctrl+w',
        searchKey: 'ctrl+shift+k',
        persistMcp: false,
        cornerFont: true,
        lspIconStyle: 'nerd',
        rowDensity: 'comfortable',
        sectionItemLimits: {},
        quickActionOrder: [...QUICK_ACTION_IDS],
        quickActionVisibility: {},
      },
      layout: {
        sections: { ...builtIns.layout.sections, todo: false },
        expanded: builtIns.layout.expanded,
        order: ['mcp', 'todo', 'subagents', 'skills', 'quick_actions', 'lsp'],
      },
      desiredMcpStates: { wiki: 'enabled', optionOnly: 'disabled', context7: 'enabled' },
    })
  })
})
