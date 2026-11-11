import { For, Show, createSignal, onCleanup, onMount } from 'solid-js'

import type { SidebarTodo } from '../../model/types'
import type { Ui } from '@opencode/plugin/gui'

export function TodoArchiveDialog(props: {
  ui: Ui
  load(signal: AbortSignal): Promise<readonly SidebarTodo[]>
  close(): void
}) {
  const [items, setItems] = createSignal<readonly SidebarTodo[]>([])
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal('')
  const abort = new AbortController()
  const Dialog = props.ui.Dialog
  const Button = props.ui.Button

  onCleanup(() => abort.abort())
  async function refresh() {
    if (busy() || abort.signal.aborted) return

    setBusy(true)
    setError('')
    try {
      const value = await props.load(abort.signal)

      if (!abort.signal.aborted) setItems(value)
    } catch (error_) {
      if (!abort.signal.aborted)
        setError(error_ instanceof Error ? error_.message : 'The archive is unavailable on this server.')
    } finally {
      if (!abort.signal.aborted) setBusy(false)
    }
  }
  onMount(() => void refresh())

  return (
    <Dialog
      title="Legacy Todo archive"
      description="Read-only Navigator tasks from the selected server. Native Todo is managed separately through chat."
      footer={
        <>
          <Button busy={busy()} onClick={() => void refresh()}>
            Refresh
          </Button>
          <Button onClick={props.close}>Close</Button>
        </>
      }
    >
      <Show when={error()}>
        <p role="alert">{error()}</p>
      </Show>
      <Show when={items().length > 0} fallback={<p>{busy() ? 'Reading archive…' : 'No archived Navigator tasks.'}</p>}>
        <ul>
          <For each={items()}>
            {(item) => (
              <li style={{ 'overflow-wrap': 'anywhere', padding: '4px 0' }}>
                {item.content}
                <small style={{ opacity: 0.6 }}> — {item.status}</small>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </Dialog>
  )
}
