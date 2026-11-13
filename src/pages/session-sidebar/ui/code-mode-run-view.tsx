import { createContext } from 'solid-js'

import type { SidebarInteraction, SidebarPosition } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { Component } from 'solid-js'

export type CodeModeRunProps = {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  position: SidebarPosition
  id: string
}
export const CodeModeRunView = createContext<Component<CodeModeRunProps>>()
