import { expect, test } from 'bun:test'

test('the built bundle preserves its public exports', async () => {
  // @ts-expect-error The package intentionally publishes JavaScript without declarations.
  const module = await import('../dist/tui.js')

  expect(Object.keys(module).sort()).toEqual([
    'DEFAULT_SECTION_EXPANSION',
    'FOCUS_COMMAND',
    'FirstRunWizard',
    'KeyboardHelpDialog',
    'LspBadge',
    'McpSection',
    'QUICK_ACTIONS',
    'Section',
    'SectionFilter',
    'SettingsDialog',
    'SidebarFocusBinding',
    'SidebarToggleBinding',
    'SkillsSection',
    'createMcpController',
    'createPreferencesController',
    'createSidebarInteraction',
    'createSkillController',
    'createSubagentController',
    'createTodoController',
    'default',
    'isEffectivelyVisible',
    'lspIcon',
    'matchesFilter',
    'openFirstRunWizard',
    'openKeyboardHelp',
    'openSettings',
    'showFirstRunWizard',
  ])
  expect(module.default.id).toBe('opencode-navigator')
})
