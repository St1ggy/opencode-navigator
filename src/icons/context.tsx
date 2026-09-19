import { type Accessor, type JSX, createContext, useContext } from 'solid-js'

import {
  type IconStyle,
  type SettingsTab,
  type UiIcon,
  keyHint,
  quickActionIcon,
  sectionIcon,
  settingsTabIcon,
  uiIcon,
} from './ui'

import type { SidebarSection } from '../state'

function createIcons(style: Accessor<IconStyle>) {
  return {
    style,
    icon: (name: UiIcon) => uiIcon(name, style()),
    key: (keys: string) => keyHint(keys, style()),
    section: (section: SidebarSection) => sectionIcon(section, style()),
    tab: (tab: SettingsTab) => settingsTabIcon(tab, style()),
    action: (command: string) => quickActionIcon(command, style()),
  }
}

const defaultStyle: Accessor<IconStyle> = () => 'nerd'
const IconContext = createContext(createIcons(defaultStyle))

export function IconProvider(props: { style: Accessor<IconStyle>; children: JSX.Element }) {
  return <IconContext.Provider value={createIcons(() => props.style())}>{props.children}</IconContext.Provider>
}

export function useIcons() {
  return useContext(IconContext)
}
