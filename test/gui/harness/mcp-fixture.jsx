import { For, createSignal, untrack } from 'solid-js'

import { NavigatorGuiContext } from '../../../src/pages/navigator/ui/gui/context'
import { GuiMcpGroup } from '../../../src/pages/navigator/ui/gui/mcp-group'

export function McpFixture(props) {
  const [items, setItems] = createSignal([
    { name: 'synthetic-connected', status: 'connected', bucket: 'Synthetic' },
    { name: 'synthetic-failed', status: 'failed', error: 'Synthetic connection failure', bucket: 'Synthetic' },
  ])
  const [pending, setPending] = createSignal('')
  const [favorites, setFavorites] = createSignal(new Set())
  const [visibleOnly, setVisibleOnly] = createSignal(false)
  const [information, setInformation] = createSignal('')
  const [calls, setCalls] = createSignal([])
  const ui = untrack(() => props.ui)
  const Switch = ui.Switch
  const toggle = async (names) => {
    if (pending()) return

    setPending(names.join(','))
    setCalls((current) => [...current, names.join(',')])
    await new Promise((resolve) => setTimeout(resolve, 800))
    const connect = items().some((item) => names.includes(item.name) && item.status !== 'connected')

    setItems((current) =>
      current.map((item) =>
        names.includes(item.name) ? { ...item, status: connect ? 'connected' : 'disabled', error: undefined } : item,
      ),
    )
    setPending('')
  }
  const services = {
    ui,
    runtime: {
      catalogs: {
        preferences: {
          ready: () => true,
          favoriteMcpServers: favorites,
          toggleFavoriteMcpServer(name) {
            setFavorites((current) => {
              const next = new Set(current)

              if (next.has(name)) next.delete(name)
              else next.add(name)

              return next
            })
          },
        },
        mcp: {
          serverState: (name) => ({ status: pending().split(',').includes(name) ? 'loading' : 'ready' }),
          mutating: () => Boolean(pending()),
          bulkState: () => ({ group: 'Synthetic', status: pending() ? 'running' : 'idle' }),
          toggle: (name) => toggle([name]),
          toggleGroup: (_group, names) => toggle(names),
        },
        views: {
          mcp: {
            bucket: () => items(),
            visibility: { visible: () => (visibleOnly() ? items().slice(0, 1) : items()) },
          },
        },
      },
    },
    onMcpInformation: (item) => setInformation(item.error),
  }

  return (
    <NavigatorGuiContext.Provider value={services}>
      <Switch label="Show one synthetic server" checked={visibleOnly()} onChange={setVisibleOnly} />
      <GuiMcpGroup group="Synthetic" />
      <p role="status">{information()}</p>
      <ol aria-label="Synthetic MCP calls">
        <For each={calls()}>{(call) => <li>{call}</li>}</For>
      </ol>
    </NavigatorGuiContext.Provider>
  )
}
