import { createContext, useContext } from 'solid-js'

import type { McpItem } from '../../../../entities/mcp/model'
import type { ToolbarPin } from '../../../../entities/preferences/model'
import type { SkillInfo } from '../../../../entities/skill/model'
import type { PinnedToolbarModel } from '../../../../features/pinned-toolbar/model'
import type { Notifications } from '../../../../shared/lib/lifecycle'
import type { MonitoringRuntime } from '../../model'
import type { Ui } from '@opencode/plugin/gui'

export type NavigatorGuiServices = {
  ui: Ui
  runtime: MonitoringRuntime
  notifications: Notifications
  toolbar: PinnedToolbarModel
  onPin(pin: ToolbarPin): void
  onConfigurePin(key: string): void
  onManageToolbar(): void
  onLinkAccount?(): void
  onBankedResets?(): void
  onSettings?(): void
  onEnableTodo(): void
  onArchive(): void
  onSkill(skill: SkillInfo): void
  onMcpInformation(item: McpItem): void
  onCodeModeRun?(id: string): void
  onCodeModeRouting?(server: string): void
  onMcpPresets?(): void
}

export const NavigatorGuiContext = createContext<NavigatorGuiServices>()

export function useNavigatorGui() {
  const services = useContext(NavigatorGuiContext)

  if (!services) throw new Error('Navigator GUI services are unavailable')

  return services
}
