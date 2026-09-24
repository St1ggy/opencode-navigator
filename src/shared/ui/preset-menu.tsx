import { type ScrollBoxRenderable, TextAttributes } from '@opentui/core'
import { For, createEffect, onCleanup } from 'solid-js'

import { PLUGIN_ID } from '../config'

import { DialogSurface, useDialogScroll, useDialogState, useDialogs } from './dialog'
import { useIcons } from './icons'
import { SelectionBox } from './selection-box'

import type { UiIcon } from './icons'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export type PresetOption = { title: string; value: string; description: string; icon?: UiIcon }

export function PresetMenu(props: {
  api: TuiPluginApi
  title: string
  options: PresetOption[]
  height?: number
  onSelect: (option: PresetOption) => void
}) {
  const icons = useIcons()
  const dialogs = useDialogs(props.api)
  const scroll = useDialogScroll()
  const [active, setActive] = useDialogState('selection', 0)
  const theme = () => props.api.theme.current
  let body: ScrollBoxRenderable | undefined
  const prefix = `${PLUGIN_ID}.mcp-preset-menu`

  createEffect(() => {
    if (active() >= props.options.length) setActive(Math.max(0, props.options.length - 1))
  })
  function move(offset: number) {
    if (props.options.length === 0) return

    const next = (active() + offset + props.options.length) % props.options.length

    setActive(next)
    body?.scrollChildIntoView(`${prefix}.${next}`)
  }
  const unregister = props.api.keymap.registerLayer({
    mode: 'modal',
    priority: 1000,
    commands: [
      { name: `${prefix}.previous`, run: () => move(-1) },
      { name: `${prefix}.next`, run: () => move(1) },
      { name: `${prefix}.select`, run: () => props.options[active()] && props.onSelect(props.options[active()]) },
    ],
    bindings: [
      { key: 'up', cmd: `${prefix}.previous` },
      { key: 'down', cmd: `${prefix}.next` },
      { key: 'return', cmd: `${prefix}.select` },
      { key: 'space', cmd: `${prefix}.select` },
    ],
  })

  onCleanup(unregister)

  return (
    <DialogSurface api={props.api}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme().text}>
          {icons.icon('presets')} {props.title}
        </text>
        <text fg={theme().textMuted} onMouseUp={dialogs.back}>
          {icons.key('esc')}
        </text>
      </box>
      <scrollbox
        ref={(node) => {
          body = node
          scroll.ref(node)
        }}
        renderBefore={scroll.restore}
        renderAfter={scroll.save}
        height={props.height ?? Math.min(props.options.length * 3, 15)}
        scrollX={false}
      >
        <box gap={1}>
          <For each={props.options}>
            {(option, index) => (
              <SelectionBox
                id={`${prefix}.${index()}`}
                paddingLeft={1}
                paddingRight={1}
                backgroundColor={active() === index() ? theme().backgroundElement : undefined}
                onMouseOver={() => setActive(index())}
                onMouseUp={(event) => {
                  event.stopPropagation()
                  setActive(index())
                  props.onSelect(option)
                }}
              >
                <text
                  attributes={active() === index() ? TextAttributes.BOLD : undefined}
                  fg={theme().text}
                  wrapMode="word"
                >
                  {option.icon ? `${icons.icon(option.icon)} ` : ''}
                  {option.title}
                </text>
                <text fg={theme().textMuted} wrapMode="word">
                  {option.description}
                </text>
              </SelectionBox>
            )}
          </For>
        </box>
      </scrollbox>
      <text fg={theme().textMuted}>
        {icons.key('up/down')} navigate · {icons.key('enter')} select · {icons.key('esc')} close
      </text>
    </DialogSurface>
  )
}
