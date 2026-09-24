import { expect, test } from 'bun:test'

import * as compatibilityCommon from '../src/components/common'
import * as compatibilityListVisibility from '../src/components/list-visibility'
import * as compatibilitySectionBoundary from '../src/components/section-boundary'
import * as compatibilitySectionTab from '../src/components/section-tab'
import * as compatibilitySections from '../src/components/sections'
import * as compatibilitySidebar from '../src/components/sidebar'
import * as compatibilityTab from '../src/components/tab'
import * as sessionSidebar from '../src/pages/session-sidebar'
import * as sharedUi from '../src/shared/ui'
import * as compatibilityInteraction from '../src/sidebar-interaction'

test('the legacy sections module re-exports the page slice API', () => {
  expect(compatibilitySections.LspBadge).toBe(sessionSidebar.LspBadge)
  expect(compatibilitySections.LspSection).toBe(sessionSidebar.LspSection)
  expect(compatibilitySections.McpSection).toBe(sessionSidebar.McpSection)
  expect(compatibilitySections.QuickActionsSection).toBe(sessionSidebar.QuickActionsSection)
  expect(compatibilitySections.SkillsSection).toBe(sessionSidebar.SkillsSection)
  expect(compatibilitySections.SubagentSection).toBe(sessionSidebar.SubagentSection)
  expect(compatibilitySections.TodoSection).toBe(sessionSidebar.TodoSection)
})

test('legacy sidebar modules preserve the page and shared UI exports', () => {
  expect(compatibilityCommon.Section).toBe(sessionSidebar.Section)
  expect(compatibilityCommon.SectionFilter).toBe(sessionSidebar.SectionFilter)
  expect(compatibilityCommon.matchesFilter).toBe(sessionSidebar.matchesFilter)
  expect(compatibilityListVisibility.ListVisibilityControl).toBe(sessionSidebar.ListVisibilityControl)
  expect(compatibilitySectionBoundary.SectionBoundary).toBe(sessionSidebar.SectionBoundary)
  expect(compatibilitySectionTab.SectionTab).toBe(sessionSidebar.SectionTab)
  expect(compatibilitySidebar.SidebarContent).toBe(sessionSidebar.SidebarContent)
  expect(compatibilitySidebar.SidebarFocusBinding).toBe(sessionSidebar.SidebarFocusBinding)
  expect(compatibilityInteraction.createSidebarInteraction).toBe(sessionSidebar.createSidebarInteraction)
  expect(compatibilityTab.Tab).toBe(sharedUi.Tab)
})

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
