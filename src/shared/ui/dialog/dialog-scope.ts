import { createContext } from 'solid-js'

import type { TuiDialogPromptProps, TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { JSX } from 'solid-js'

export type DialogSize = 'medium' | 'large' | 'xlarge'
export type DialogFrame = { render: () => JSX.Element; size: DialogSize; state: Map<string, unknown> }
export type DialogNavigation = {
  open: (render: () => JSX.Element, size?: DialogSize) => void
  replace: (render: () => JSX.Element, size?: DialogSize) => void
  back: () => void
  prompt: (props: Omit<TuiDialogPromptProps, 'onCancel'>) => void
  close: () => void
}
export type DialogScope = { api: TuiPluginApi; navigation: DialogNavigation; frame: DialogFrame }
export const DialogContext = createContext<DialogScope>()
