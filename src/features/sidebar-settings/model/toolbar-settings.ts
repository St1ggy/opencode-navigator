import type { PreferencesController, ToolbarPin } from '../../../entities/preferences'
import type { SkillController } from '../../../entities/skill'
import type { DialogNavigation } from '../../../shared/ui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export type ToolbarSettings = {
  api: TuiPluginApi
  preferences: PreferencesController
  skills?: SkillController
  dialogs?: DialogNavigation
}
export type ToolbarPinSettings = ToolbarSettings & { pin: ToolbarPin }
