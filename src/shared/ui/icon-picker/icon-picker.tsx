import { useTerminalDimensions } from '@opentui/solid'
import { For, createEffect, createMemo, createSignal, onCleanup } from 'solid-js'

import {
  DialogHeader,
  DialogSurface,
  SelectionBox,
  terminalIcon,
  terminalIconIDs,
  terminalIconLabel,
  useDialogState,
  useDialogs,
  useIcons,
} from '../../../shared/ui'

import { IconPickerItem } from './icon-picker-item'
import { IconPickerSearch } from './icon-picker-search'

import type { IconPickerProps } from './types'
import type { ScrollBoxRenderable } from '@opentui/core'

export function IconPicker(props: IconPickerProps) {
  const icons = useIcons()
  const dialogs = useDialogs(props.api)
  const dimensions = useTerminalDimensions()
  const [query, setQuery] = useDialogState('icon-query', '')
  const [active, setActive] = useDialogState('icon-active', props.value)
  const keywords: Record<string, string> = {
    bolt: 'action lightning',
    gear: 'settings configuration',
    shield: 'permissions security',
    copy: 'clipboard transcript',
    check: 'done success',
    refresh: 'compact reload retry',
    book: 'skill documentation',
    pin: 'favorite bookmark',
  }
  const items = createMemo(() =>
    terminalIconIDs.filter((id) =>
      `${terminalIconLabel(id)} ${keywords[id] ?? ''}`.includes(query().toLowerCase().trim()),
    ),
  )
  const [width, setWidth] = createSignal(Math.max(10, dimensions().width - 12))
  const columns = createMemo(() => Math.max(1, Math.min(6, Math.floor(width() / 10))))
  const rows = createMemo(() =>
    Array.from({ length: Math.ceil(items().length / columns()) }, (_, index) =>
      items().slice(index * columns(), (index + 1) * columns()),
    ),
  )
  let body: ScrollBoxRenderable | undefined

  createEffect(() => {
    if (!items().includes(active())) setActive(items()[0] ?? '')
  })
  function move(offset: number, horizontal = false) {
    const index = items().indexOf(active())
    const start = horizontal ? Math.floor(index / columns()) * columns() : 0
    const end = horizontal ? Math.min(items().length - 1, start + columns() - 1) : items().length - 1
    const next = items()[Math.max(start, Math.min(end, index + offset))]

    if (next) {
      setActive(next)
      body?.scrollChildIntoView(`icon-picker.${next}`)
    }
  }
  function select(id = active()) {
    if (items().includes(id)) props.onSelect(id)
  }
  const prefix = 'opencode-navigator.icon-picker'
  const unregister = props.api.keymap.registerLayer({
    mode: 'modal',
    priority: 1000,
    commands: [
      { name: `${prefix}.left`, run: () => move(-1, true) },
      { name: `${prefix}.right`, run: () => move(1, true) },
      { name: `${prefix}.up`, run: () => move(-columns()) },
      { name: `${prefix}.down`, run: () => move(columns()) },
      { name: `${prefix}.select`, run: () => select() },
    ],
    bindings: ['left', 'right', 'up', 'down', 'return'].map((key) => ({
      key,
      cmd: `${prefix}.${key === 'return' ? 'select' : key}`,
    })),
  })

  onCleanup(unregister)
  const theme = () => props.api.theme.current

  return (
    <DialogSurface api={props.api} id="opencode-navigator.icon-picker">
      <DialogHeader api={props.api} title="Choose an icon" onBack={dialogs.back} />
      <IconPickerSearch api={props.api} query={query()} onInput={setQuery} />
      <SelectionBox paddingLeft={1} paddingRight={1} backgroundColor={theme().backgroundElement}>
        <text fg={theme().accent} wrapMode="none" truncate>
          {terminalIcon(active(), icons.style())} {terminalIconLabel(active()) || 'No matching icons'}
          {active() === props.value ? ' · selected' : ''}
        </text>
      </SelectionBox>
      <scrollbox
        ref={(node) => {
          body = node
        }}
        onSizeChange={function (this: ScrollBoxRenderable) {
          setWidth(this.width)
        }}
        height={Math.max(2, Math.min(10, Math.floor(dimensions().height * 0.6) - 9))}
        scrollX={false}
      >
        <For each={rows()}>
          {(row) => (
            <box flexDirection="row" gap={1}>
              <For each={row}>
                {(id) => (
                  <IconPickerItem
                    api={props.api}
                    id={id}
                    active={id === active()}
                    selected={id === props.value}
                    onHover={() => setActive(id)}
                    onSelect={() => select(id)}
                  />
                )}
              </For>
            </box>
          )}
        </For>
      </scrollbox>
      <text height={1} truncate fg={theme().textMuted} wrapMode="none">
        {icons.key('up/down')} rows · {icons.key('left/right')} icons · {icons.key('enter')} choose · {icons.key('esc')}{' '}
        cancel
      </text>
    </DialogSurface>
  )
}
