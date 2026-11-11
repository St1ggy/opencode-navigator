import { For, Show, createMemo } from 'solid-js'

import { toolbarPinKey } from '../../../../entities/preferences/model'
import { fitToolbarButtons } from '../../model'

import { createMeasuredToolbar } from './measured-layout'
import { GuiToolbarButton } from './toolbar-button'

import type { PinnedToolbarModel } from '../../model'
import type { Ui } from '@opencode/plugin/gui'

function navigate(event: KeyboardEvent) {
  if (event.defaultPrevented || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return

  const buttons = [
    ...(event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>(':scope [data-toolbar-visible] button'),
  ]
  const index = buttons.indexOf(event.target as HTMLButtonElement)
  const next = Math.max(0, Math.min(buttons.length - 1, index + (event.key === 'ArrowRight' ? 1 : -1)))

  if (index === -1 || index === next) return

  event.preventDefault()
  event.stopPropagation()
  buttons[next]?.focus()
}

export function GuiPinnedToolbar(props: {
  ui: Ui
  model: PinnedToolbarModel
  overflow: 'menu' | 'wrap'
  configure(key: string): void
  manage(): void
}) {
  const Menu = props.ui.Menu
  const layout = createMeasuredToolbar()
  const keys = createMemo(() => props.model.pins().map((pin) => toolbarPinKey(pin)))
  const count = createMemo(() =>
    props.overflow === 'wrap'
      ? keys().length
      : fitToolbarButtons(
          layout.width(),
          keys().map((key) => layout.widths()[key] ?? layout.width()),
          layout.moreWidth(),
        ),
  )
  const visible = createMemo(() => keys().slice(0, count()))
  const hidden = createMemo(() => keys().slice(count()))
  const pin = (key: string) => props.model.pins().find((item) => toolbarPinKey(item) === key)

  return (
    <Show when={keys().length > 0}>
      <div
        ref={layout.root}
        data-navigator-toolbar
        role="toolbar"
        tabIndex={-1}
        aria-label="Navigator pins"
        onKeyDown={navigate}
        style={{
          position: 'relative',
          display: 'flex',
          'flex-wrap': props.overflow === 'wrap' ? 'wrap' : 'nowrap',
          gap: '4px',
          'align-items': 'center',
          'justify-content': 'center',
          padding: '0 4px',
          'min-height': '28px',
          'margin-bottom': '8px',
        }}
      >
        <For each={visible()}>
          {(key) => (
            <Show when={pin(key)}>
              {(item) => (
                <GuiToolbarButton
                  ui={props.ui}
                  model={props.model}
                  pin={item()}
                  width={layout.width()}
                  configure={props.configure}
                />
              )}
            </Show>
          )}
        </For>
        <Show when={hidden().length > 0}>
          <span data-toolbar-visible>
            <Menu
              label="More toolbar items"
              trigger="icon"
              items={[
                {
                  type: 'group',
                  label: 'More pins',
                  items: hidden().map((key) => ({
                    label: props.model.view(pin(key)!).label,
                    onSelect: () => props.model.run(key),
                  })),
                },
                { type: 'separator' },
                { label: 'Configure toolbar', icon: 'settings-gear', onSelect: props.manage },
              ]}
            />
          </span>
        </Show>
        <div
          aria-hidden="true"
          inert
          style={{
            position: 'absolute',
            left: '0',
            top: '0',
            width: '0',
            height: '0',
            overflow: 'hidden',
            visibility: 'hidden',
            'pointer-events': 'none',
          }}
        >
          <div style={{ display: 'flex', gap: '4px', width: 'max-content' }}>
            <For each={keys()}>
              {(key) => (
                <Show when={pin(key)}>
                  {(item) => (
                    <GuiToolbarButton
                      ui={props.ui}
                      model={props.model}
                      pin={item()}
                      width={layout.width()}
                      configure={props.configure}
                      measuring
                      measure={(node) => layout.button(key, node)}
                    />
                  )}
                </Show>
              )}
            </For>
            <span ref={layout.more}>
              <Menu label="More toolbar items" trigger="icon" items={[]} disabled />
            </span>
          </div>
        </div>
      </div>
    </Show>
  )
}
