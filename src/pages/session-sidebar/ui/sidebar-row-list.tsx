import { createContext, useContext } from 'solid-js'

import type { SidebarRowDensity } from '../../../shared/config'
import type { SidebarInteraction } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { JSX } from 'solid-js'

type SidebarListContext = {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  grouped: () => boolean
}

const Context = createContext<SidebarListContext>()

export function useSidebarList() {
  const value = useContext(Context)

  if (!value) throw new Error('No sidebar list')

  return value
}

export function SidebarRowList(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  grouped?: () => boolean
  density: SidebarRowDensity
  children: JSX.Element
}) {
  return (
    <Context.Provider
      value={{ api: props.api, interaction: props.interaction, grouped: props.grouped ?? (() => false) }}
    >
      <box gap={props.density === 'comfortable' ? 1 : 0}>{props.children}</box>
    </Context.Provider>
  )
}
