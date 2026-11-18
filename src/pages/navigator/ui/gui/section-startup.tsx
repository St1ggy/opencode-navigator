import { Show, createContext, useContext } from 'solid-js'

import { GuiLoadingSurface } from '../../../../shared/ui/gui'

import { useNavigatorGui } from './context'

import type { SidebarSection } from '../../../../shared/config'
import type { JSX } from 'solid-js'

const MaskedContext = createContext(false)

export function SectionStartup(props: { id: SidebarSection; title: string; children: JSX.Element }) {
  const services = useNavigatorGui()
  const masked = useContext(MaskedContext)
  const key = () => JSON.stringify([services.runtime.target.sessionKey, props.id])

  return (
    <Show when={!masked} fallback={props.children}>
      <GuiLoadingSurface
        loading={services.runtime.startup?.loading(props.id) ?? false}
        label={`Loading ${props.title}`}
        saved={services.sectionLayouts?.read(key())}
        remember={(layout) => services.sectionLayouts?.write(key(), layout)}
      >
        <MaskedContext.Provider value={true}>{props.children}</MaskedContext.Provider>
      </GuiLoadingSurface>
    </Show>
  )
}
