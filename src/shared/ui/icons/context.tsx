import { type Accessor, type JSX, createContext, useContext } from 'solid-js'

import {
  type IconStyle,
  type SectionIconName,
  type SettingsTab,
  type UiIcon,
  keyHint,
  quickActionIcon,
  sectionIcon,
  settingsTabIcon,
  uiIcon,
} from './icons'

function createIcons(style: Accessor<IconStyle>, multilineCorners: Accessor<boolean> = () => true) {
  return {
    style,
    multilineCorners,
    icon: (name: UiIcon) => uiIcon(name, style()),
    key: (keys: string) => keyHint(keys, style()),
    section: (section: SectionIconName) => sectionIcon(section, style()),
    tab: (tab: SettingsTab) => settingsTabIcon(tab, style()),
    action: (command: string) => quickActionIcon(command, style()),
  }
}

const defaultStyle: Accessor<IconStyle> = () => 'nerd'
const IconContext = createContext(createIcons(defaultStyle))

export function IconProvider(props: {
  style: Accessor<IconStyle>
  multilineCorners?: Accessor<boolean>
  children: JSX.Element
}) {
  return (
    <IconContext.Provider
      value={createIcons(
        () => props.style(),
        () => props.multilineCorners?.() !== false,
      )}
    >
      {props.children}
    </IconContext.Provider>
  )
}

export function useIcons() {
  return useContext(IconContext)
}
