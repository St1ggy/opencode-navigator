import { For, Show, createEffect, createSignal, onCleanup } from 'solid-js'

import { toolbarPinKey } from '../../../../entities/preferences/model'

import type { ToolbarPin } from '../../../../entities/preferences/model'
import type { Ui } from '@opencode/plugin/gui'

const source = (pin: ToolbarPin) => (pin.kind === 'skill' ? pin.location : undefined)

export function GuiToolbarManager(props: {
  ui: Ui
  pins: readonly ToolbarPin[]
  label(pin: ToolbarPin): string
  current(): boolean
  close(): void
  configure(key: string): void
  move(key: string, direction: -1 | 1): Promise<void>
  remove(key: string): Promise<void>
}) {
  const Dialog = props.ui.Dialog
  const Button = props.ui.Button
  const IconButton = props.ui.IconButton
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal('')
  let disposed = false

  onCleanup(() => {
    disposed = true
  })
  createEffect(() => {
    if (!props.current()) props.close()
  })

  async function run(operation: () => Promise<void>) {
    if (busy() || !props.current()) return

    setBusy(true)
    setError('')
    try {
      await operation()
    } catch (error_) {
      if (!disposed) setError(error_ instanceof Error ? error_.message : 'Could not save the toolbar change.')
    } finally {
      if (!disposed) setBusy(false)
    }
  }

  return (
    <Dialog
      title="Navigator toolbar"
      size="large"
      description="Private pins are shared across sessions and worktrees. Changes here do not run a Skill or command."
      footer={<Button onClick={props.close}>Close</Button>}
    >
      <Show when={error()}>
        <p role="alert">{error()}</p>
      </Show>
      <ol style={{ padding: '0', margin: '0', 'list-style': 'none' }}>
        <For
          each={props.pins.map((pin) => toolbarPinKey(pin))}
          fallback={<li>Pin a Skill or Quick Action from its row menu.</li>}
        >
          {(key, index) => (
            <Show when={props.pins.find((item) => toolbarPinKey(item) === key)}>
              {(pin) => (
                <li
                  style={{ padding: '8px 0', display: 'flex', gap: '4px', 'align-items': 'center', 'min-width': '0' }}
                >
                  <span style={{ flex: '1', 'min-width': '0', 'overflow-wrap': 'anywhere' }}>
                    <strong>{props.label(pin())}</strong>
                    <Show when={source(pin())}>
                      <small style={{ display: 'block', opacity: 0.6 }}>{source(pin())}</small>
                    </Show>
                  </span>
                  <IconButton
                    icon="arrow-up"
                    label={`Move ${props.label(pin())} up`}
                    disabled={busy() || index() === 0}
                    onClick={() => void run(() => props.move(key, -1))}
                  />
                  <IconButton
                    icon="chevron-down"
                    label={`Move ${props.label(pin())} down`}
                    disabled={busy() || index() === props.pins.length - 1}
                    onClick={() => void run(() => props.move(key, 1))}
                  />
                  <Button size="small" disabled={busy()} onClick={() => props.configure(key)}>
                    Configure
                  </Button>
                  <IconButton
                    icon="close"
                    label={`Unpin ${props.label(pin())}`}
                    disabled={busy()}
                    onClick={() => void run(() => props.remove(key))}
                  />
                </li>
              )}
            </Show>
          )}
        </For>
      </ol>
    </Dialog>
  )
}
