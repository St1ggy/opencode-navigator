import { onCleanup } from 'solid-js'

import type { ExecuteInspector, ExecutePayload } from '../model'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { ScrollBoxRenderable } from '@opentui/core'

export function executeKeymap(api: TuiPluginApi, model: ExecuteInspector, body: () => ScrollBoxRenderable | undefined) {
  function select(kind: ExecutePayload) {
    model.setTab(kind)

    if (model.metadata()) model.toggleMetadata()
  }
  function move(delta: number) {
    model.move(delta)
    select(model.tab())
  }
  function view() {
    select(model.tab())
    model.toggleRaw()
  }
  const keys = [
    { key: 'left', run: () => move(-1) },
    { key: 'right', run: () => move(1) },
    { key: 'shift+tab', run: () => move(-1) },
    { key: 'tab', run: () => move(1) },
    { key: '1', run: () => select('input') },
    { key: '2', run: () => select('output') },
    { key: '3', run: () => select('error') },
    { key: 'v', run: view },
    { key: 'i', run: model.toggleMetadata },
    ...[
      ['up', -1],
      ['down', 1],
      ['k', -1],
      ['j', 1],
      ['pageup', -8],
      ['pagedown', 8],
    ].map(([key, delta]) => ({ key: String(key), run: () => body()?.scrollBy(Number(delta)) })),
  ]
  const unregister = api.keymap.registerLayer({
    mode: 'modal',
    commands: keys.map(({ run }, index) => ({ name: `opencode-navigator.execute.${index}`, run })),
    bindings: keys.map(({ key }, index) => ({ key, cmd: `opencode-navigator.execute.${index}` })),
  })

  onCleanup(unregister)

  return { select, view }
}
