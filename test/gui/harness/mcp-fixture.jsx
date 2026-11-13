import { For, createSignal, untrack } from 'solid-js'

import { GuiSearchResultRow } from '../../../src/features/search-everything/ui/gui/result-row'
import { NavigatorGuiContext } from '../../../src/pages/navigator/ui/gui/context'
import { GuiMcpGroup } from '../../../src/pages/navigator/ui/gui/mcp-group'

export function McpFixture(props) {
  const [items, setItems] = createSignal([
    {
      name: 'synthetic-connected',
      title: 'A deliberately long synthetic server title that wraps onto several lines in a narrow sidebar.',
      status: 'connected',
      bucket: 'Synthetic',
    },
    { name: 'synthetic-failed', status: 'failed', error: 'Synthetic connection failure', bucket: 'Synthetic' },
  ])
  const [pending, setPending] = createSignal('')
  const [complete, setComplete] = createSignal()
  const [favorites, setFavorites] = createSignal(new Set())
  const [visibleOnly, setVisibleOnly] = createSignal(false)
  const [information, setInformation] = createSignal('')
  const [calls, setCalls] = createSignal([])
  const [searchConnected, setSearchConnected] = createSignal(true)
  const [routingMode, setRoutingMode] = createSignal('code')
  const ui = untrack(() => props.ui)
  const Switch = ui.Switch
  const Button = ui.Button
  const toggle = async (names) => {
    if (pending()) return

    setPending(names.join(','))
    setCalls((current) => [...current, names.join(',')])
    await new Promise((resolve) => setComplete(() => resolve))

    if (names.includes('synthetic-search')) setSearchConnected((value) => !value)

    const connect = items().some((item) => names.includes(item.name) && item.status !== 'connected')

    setItems((current) =>
      current.map((item) =>
        names.includes(item.name) ? { ...item, status: connect ? 'connected' : 'disabled', error: undefined } : item,
      ),
    )
    setPending('')
    setComplete(undefined)
  }
  const toggleError = () =>
    setItems((current) =>
      current.map((item) =>
        item.name === 'synthetic-connected'
          ? { ...item, error: item.error ? undefined : 'Synthetic transient error' }
          : item,
      ),
    )
  const services = {
    ui,
    runtime: {
      codeMode: {
        routing: (name) => ({ mode: name === 'synthetic-connected' ? routingMode() : 'code', explicit: true }),
      },
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
          bulkState: () => ({ group: 'Synthetic', status: pending().includes(',') ? 'running' : 'idle' }),
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
    onCodeModeRouting: (name) => setInformation(`Routing preview requested: ${name}`),
  }

  return (
    <NavigatorGuiContext.Provider value={services}>
      <div data-synthetic-mcp-layout style={{ width: '360px', 'max-width': '100%' }}>
        <Switch label="Show one synthetic server" checked={visibleOnly()} onChange={setVisibleOnly} />
        <GuiMcpGroup group="Synthetic" />
      </div>
      <ul aria-label="Synthetic MCP search" style={{ padding: '0', 'list-style': 'none' }}>
        <GuiSearchResultRow
          ui={ui}
          result={{
            id: 'mcp:synthetic-search',
            group: 'MCP',
            server: 'synthetic-search',
            title: 'synthetic-search',
            description: 'Synthetic search result',
            connected: searchConnected(),
          }}
          selected={false}
          busy={pending() === 'synthetic-search'}
          focus={() => setInformation('Synthetic search focused')}
          run={() => void toggle(['synthetic-search'])}
          toggleFavorite={() => setInformation('Synthetic search bookmark')}
          information={() => setInformation('Synthetic search information')}
        />
      </ul>
      <Button disabled={!pending()} onClick={() => complete()?.()}>
        Complete synthetic MCP operation
      </Button>
      <Button onClick={toggleError}>Toggle synthetic MCP error</Button>
      <Button onClick={() => setRoutingMode((mode) => (mode === 'code' ? 'direct' : 'code'))}>
        Change synthetic routing label
      </Button>
      <p role="status">{information()}</p>
      <ol aria-label="Synthetic MCP calls" style={{ height: '64px', 'overflow-y': 'auto' }}>
        <For each={calls()}>{(call) => <li>{call}</li>}</For>
      </ol>
    </NavigatorGuiContext.Provider>
  )
}
