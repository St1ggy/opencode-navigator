import type {
  DesiredMcpState,
  LayoutPresets,
  McpPresets,
  PendingResetAttempt,
  PluginSettings,
  PreferencesDocument,
  QuickActionId,
  SectionLayoutDefault,
} from './schema'
import type { ToolbarPinUpdate } from './toolbar-pins'

export type PreferenceTarget = { kind: 'global' } | { kind: 'worktree'; key: string }

export type PreferencesUpdate = {
  target?: PreferenceTarget
  expectedScope?: string
  layout?: SectionLayoutDefault
  clearLayout?: boolean
  behavior?: Partial<PluginSettings>
  clearBehavior?: boolean
  user?: {
    skippedSkillConfirmations?: string[]
    skillConfirmation?: { location: string; skipped: boolean }
    clearSkillConfirmations?: boolean
    onboardingCompleted?: boolean
    lastNavigatorVersion?: string
    previousNavigatorVersion?: string
    layoutPresets?: LayoutPresets
    layoutPreset?: { name: string; layout?: SectionLayoutDefault; previousName?: string }
    mcpPresets?: McpPresets
    mcpPreset?:
      | { operation: 'save' | 'update'; name: string; states: Record<string, DesiredMcpState> }
      | { operation: 'rename'; name: string; previousName: string }
      | { operation: 'delete'; name: string }
    favoriteSkills?: string[]
    favoriteSkill?: { location: string; favorite: boolean }
    favoriteMcpServer?: { name: string; favorite: boolean }
    favoriteQuickAction?: { id: QuickActionId; favorite: boolean }
    recentSkill?: string
    recentQuickAction?: QuickActionId
    mcpServerGroup?: { name: string; group?: string }
    skillGroup?: { location: string; group?: string }
    autoApprovePermissions?: boolean
    toolbarPin?: ToolbarPinUpdate
    codexAccountBinding?: { providerID: string; modelID?: string; connectionID?: string; accountID?: string }
    pendingResetAttempt?: PendingResetAttempt
    clearPendingResetAttempt?: string
    workspaceProfile?: { layout: string; mcp?: string }
  }
  mcp?: {
    scope?: string
    name?: string
    state?: DesiredMcpState
    states?: Record<string, DesiredMcpState>
  }
  clearMcp?: boolean
}

export type PreferencesStore = {
  load(): Promise<PreferencesDocument>
  update(change: PreferencesUpdate): Promise<void>
  flush(): Promise<void>
}
