import { Schema } from 'effect'

import { MAX_LIMITS_REFRESH_MINUTES, QUICK_ACTION_IDS, SIDEBAR_SECTIONS } from '../../../shared/config'

const optional = Schema.optional
const string = Schema.String
const boolean = Schema.Boolean
const count = Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0))
const interval = Schema.Number.check(
  Schema.isInt(),
  Schema.isBetween({ minimum: 1, maximum: MAX_LIMITS_REFRESH_MINUTES }),
)
const strings = Schema.mutable(Schema.Array(string))
const action = Schema.Literals(QUICK_ACTION_IDS)
const section = Schema.Literals(SIDEBAR_SECTIONS)
const states = Schema.Record(string, Schema.Literals(['enabled', 'disabled']))
const groups = Schema.Record(string, string)
const sections = Schema.Struct({
  limits: optional(boolean),
  todo: optional(boolean),
  subagents: optional(boolean),
  skills: optional(boolean),
  quick_actions: optional(boolean),
  lsp: optional(boolean),
  mcp: optional(boolean),
  code_mode: optional(boolean),
})
const layout = Schema.Struct({ sections, expanded: sections, order: optional(Schema.mutable(Schema.Array(section))) })
const icons = {
  icon: string,
  icons: optional(strings),
  text: optional(string),
  stateIcons: optional(groups),
  stateIconLists: optional(Schema.Record(string, strings)),
}
const pin = Schema.Union([
  Schema.Struct({ ...icons, kind: Schema.Literal('action'), id: action }),
  Schema.Struct({ ...icons, kind: Schema.Literal('skill'), location: string, name: string }),
])
const pinUpdate = Schema.Union([
  Schema.Struct({ operation: Schema.Literal('pin'), pin }),
  Schema.Struct({
    operation: Schema.Literal('configure'),
    key: string,
    icon: string,
    icons: optional(Schema.NullOr(strings)),
    text: optional(Schema.NullOr(string)),
    stateIcons: optional(Schema.Record(string, Schema.NullOr(string))),
    stateIconLists: optional(Schema.Record(string, Schema.NullOr(strings))),
    expected: optional(string),
  }),
  Schema.Struct({ operation: Schema.Literal('remove'), key: string }),
  Schema.Struct({ operation: Schema.Literal('move'), key: string, before: optional(string) }),
])
const behavior = Schema.Struct({
  toggleKey: optional(string),
  focusKey: optional(string),
  searchKey: optional(string),
  persistMcp: optional(boolean),
  limitsRefreshMinutes: optional(interval),
  startInChat: optional(boolean),
  showSessionTitle: optional(boolean),
  showSessionDate: optional(boolean),
  cornerFont: optional(boolean),
  lspIconStyle: optional(Schema.Literals(['nerd', 'text'])),
  rowDensity: optional(Schema.Literals(['compact', 'comfortable'])),
  toolbarOverflow: optional(Schema.Literals(['menu', 'wrap'])),
  codeModePlacement: optional(Schema.Literals(['mcp', 'section'])),
  sectionItemLimits: optional(Schema.Record(string, count)),
  quickActionOrder: optional(Schema.mutable(Schema.Array(action))),
  quickActionVisibility: optional(Schema.Record(string, boolean)),
})
const mcpPreset = Schema.Union([
  Schema.Struct({ operation: Schema.Literals(['save', 'update']), name: string, states }),
  Schema.Struct({ operation: Schema.Literal('rename'), name: string, previousName: string }),
  Schema.Struct({ operation: Schema.Literal('delete'), name: string }),
])
const attempt = Schema.Struct({
  providerID: string,
  modelID: string,
  accountID: string,
  connectionID: optional(string),
  creditID: optional(string),
  idempotencyKey: string,
  createdAt: Schema.Number,
})

export const PreferencesChange = Schema.Struct({
  target: optional(
    Schema.Union([
      Schema.Struct({ kind: Schema.Literal('global') }),
      Schema.Struct({ kind: Schema.Literal('worktree'), key: string }),
    ]),
  ),
  expectedScope: optional(string),
  layout: optional(layout),
  clearLayout: optional(boolean),
  behavior: optional(behavior),
  clearBehavior: optional(boolean),
  user: optional(
    Schema.Struct({
      skippedSkillConfirmations: optional(strings),
      skillConfirmation: optional(Schema.Struct({ location: string, skipped: boolean })),
      clearSkillConfirmations: optional(boolean),
      onboardingCompleted: optional(boolean),
      lastNavigatorVersion: optional(string),
      previousNavigatorVersion: optional(string),
      layoutPresets: optional(Schema.Record(string, layout)),
      layoutPreset: optional(Schema.Struct({ name: string, layout: optional(layout), previousName: optional(string) })),
      mcpPresets: optional(Schema.Record(string, states)),
      mcpPreset: optional(mcpPreset),
      favoriteSkills: optional(strings),
      favoriteSkill: optional(Schema.Struct({ location: string, favorite: boolean })),
      favoriteMcpServer: optional(Schema.Struct({ name: string, favorite: boolean })),
      favoriteQuickAction: optional(Schema.Struct({ id: action, favorite: boolean })),
      recentSkill: optional(string),
      recentQuickAction: optional(action),
      mcpServerGroup: optional(Schema.Struct({ name: string, group: optional(string) })),
      skillGroup: optional(Schema.Struct({ location: string, group: optional(string) })),
      autoApprovePermissions: optional(boolean),
      toolbarPin: optional(pinUpdate),
      codexAccountBinding: optional(
        Schema.Struct({
          providerID: string,
          modelID: optional(string),
          connectionID: optional(string),
          accountID: optional(string),
        }),
      ),
      pendingResetAttempt: optional(attempt),
      clearPendingResetAttempt: optional(string),
      workspaceProfile: optional(Schema.Struct({ layout: string, mcp: optional(string) })),
    }),
  ),
  mcp: optional(
    Schema.Struct({
      scope: optional(string),
      name: optional(string),
      state: optional(Schema.Literals(['enabled', 'disabled'])),
      states: optional(states),
    }),
  ),
  clearMcp: optional(boolean),
})
