import type { SidebarSection } from '../../../../shared/config'
import type { IconName } from '@opencode/plugin/gui'

export const sectionIcons: Readonly<Record<SidebarSection, IconName>> = {
  code_mode: 'code-slash',
  limits: 'monitor',
  todo: 'checklist',
  subagents: 'branch-out',
  skills: 'graduation-cap',
  quick_actions: 'console',
  lsp: 'code',
  mcp: 'mcp',
}
