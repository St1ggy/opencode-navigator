import { For, Show, createMemo, createSignal } from 'solid-js'

import { toolbarPinKey } from '../../../entities/preferences'
import { SelectionMenu, createDialogStack, useIcons } from '../../../shared/ui'
import { toolbarLayout } from '../model/toolbar-layout'
import { type ToolbarServices, createToolbarModel } from '../model/toolbar-model'

import { ToolbarButton } from './toolbar-button'

import type { BoxRenderable } from '@opentui/core'

export function SidebarToolbar(props: ToolbarServices) {
  const model = createToolbarModel(props)
  const icons = useIcons()
  const [width, setWidth] = createSignal(3)
  const [detail, setDetail] = createSignal<string>()
  const keys = createMemo(() => model.pins().map((pin) => toolbarPinKey(pin)))
  const widths = createMemo(() => new Map(model.pins().map((pin) => [toolbarPinKey(pin), model.width(pin)])))
  const layout = createMemo(() =>
    toolbarLayout(keys(), width(), props.preferences.toolbarOverflow?.() ?? 'menu', widths()),
  )
  const rows = createMemo(() => layout().rows.map((_, index) => index))
  const byKey = createMemo(() => new Map(model.pins().map((pin) => [toolbarPinKey(pin), pin])))
  const view = (key: string) => {
    const pin = byKey().get(key)

    return pin && model.view(pin)
  }
  const details = createMemo(() => {
    if (detail() === 'toolbar:more') return 'More pinned actions and Skills'

    const item = view(detail() ?? '')

    return item ? [item.label, item.stateLabel, item.reason].filter(Boolean).join(' · ') : undefined
  })

  function showMore() {
    const route = JSON.stringify(props.api.route.current)
    const dialogs = createDialogStack(
      props.api,
      icons.style,
      () => route === JSON.stringify(props.api.route.current),
      icons.multilineCorners,
    )

    dialogs.open(() => (
      <SelectionMenu
        api={props.api}
        title="More pinned buttons"
        height={16}
        options={layout().overflow.flatMap((key) => {
          const item = view(key)

          return item
            ? [{ title: item.label, value: key, description: item.reason ?? item.stateLabel ?? 'Run pinned item' }]
            : []
        })}
        onSelect={(option) => {
          if (view(option.value)?.reason) {
            model.run(option.value)

            return
          }

          dialogs.close()
          model.run(option.value)
        }}
      />
    ))
  }

  return (
    <Show when={keys().length > 0}>
      <box
        id="opencode-navigator.toolbar"
        overflow="visible"
        onSizeChange={function (this: BoxRenderable) {
          setWidth(this.width)
        }}
      >
        <For each={rows()}>
          {(row) => (
            <box flexDirection="row" gap={1}>
              <For each={layout().rows[row]}>
                {(key, column) => (
                  <ToolbarButton
                    {...props}
                    id={`opencode-navigator.toolbar.${key}`}
                    row={row}
                    column={column()}
                    label={view(key)?.label ?? 'More'}
                    icons={key === 'toolbar:more' ? ['list'] : (view(key)?.icons ?? ['bolt'])}
                    text={view(key)?.text}
                    width={layout().sizes?.[key] ?? 3}
                    reason={view(key)?.reason}
                    onRun={() => (key === 'toolbar:more' ? showMore() : model.run(key))}
                    onDetails={(_id, active) =>
                      setDetail((current) => (active ? key : current === key ? undefined : current))
                    }
                  />
                )}
              </For>
            </box>
          )}
        </For>
        <Show when={details()}>
          {(text) => (
            <text
              position="absolute"
              top={rows().length}
              left={0}
              width="100%"
              height={1}
              truncate
              wrapMode="none"
              fg={props.api.theme.current.textMuted}
            >
              {text()}
            </text>
          )}
        </Show>
      </box>
    </Show>
  )
}
