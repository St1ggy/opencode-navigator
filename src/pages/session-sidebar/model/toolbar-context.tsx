import { type JSX, createContext, useContext } from 'solid-js'

import { type PreferencesController, type ToolbarPin, toolbarPinKey } from '../../../entities/preferences'
import { type SkillController } from '../../../entities/skill'
import { openToolbarPin } from '../../../features/sidebar-settings'

import type { DialogNavigation } from '../../../shared/ui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

type ToolbarContextValue = {
  pinned(pin: ToolbarPin): boolean
  configure(pin: ToolbarPin, dialogs?: DialogNavigation): void
}
const ToolbarContext = createContext<ToolbarContextValue>()

export const useToolbar = () => useContext(ToolbarContext)

export function ToolbarProvider(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  skills: SkillController
  children: JSX.Element
}) {
  const value: ToolbarContextValue = {
    pinned: (pin) =>
      Boolean(props.preferences.toolbarPins?.().some((item) => toolbarPinKey(item) === toolbarPinKey(pin))),
    configure: (pin, dialogs) => {
      if (pin.kind === 'skill' && !pin.location) {
        props.api.ui.toast({
          variant: 'warning',
          title: 'Toolbar',
          message: 'This Skill has no host-provided source location',
        })

        return
      }

      void openToolbarPin({ api: props.api, preferences: props.preferences, skills: props.skills, pin, dialogs })
    },
  }

  return <ToolbarContext.Provider value={value}>{props.children}</ToolbarContext.Provider>
}
