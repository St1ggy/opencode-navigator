import { For, Show, createEffect, createSignal, on, onCleanup, untrack } from 'solid-js'

import { GuiTabs } from '../../../../shared/ui/gui'

import { GuiSearchResultRow } from './result-row'

import type { SearchResult, SearchViewState } from '../../model'
import type { Ui } from '@opencode/plugin/gui'

export function GuiSearchDialog(props: {
  ui: Ui
  model: SearchViewState
  current(): boolean
  close(): void
  run(result: SearchResult): Promise<boolean>
  favorite(result: SearchResult): boolean | undefined
  toggleFavorite(result: SearchResult): void
  information(result: SearchResult): void
  errors: readonly string[]
  retry(): void
  scrollTop(): number
  onScroll(top: number): void
}) {
  const Dialog = props.ui.Dialog
  const Button = props.ui.Button
  const TextInput = props.ui.TextInput
  const [busy, setBusy] = createSignal('')
  const [error, setError] = createSignal('')
  let body: HTMLUListElement | undefined
  let disposed = false
  const keys = () => props.model.rows().map((item) => item.id)

  onCleanup(() => {
    disposed = true
  })
  createEffect(() => {
    if (!props.current()) props.close()
  })
  createEffect(
    on(
      () => props.model.group(),
      () => {
        if (body) body.scrollTop = untrack(props.scrollTop)
      },
    ),
  )

  async function run(result: SearchResult) {
    if (busy() || result.disabled || !props.current()) return

    props.model.select(result.id)
    setBusy(result.id)
    setError('')
    try {
      const close = await props.run(result)

      if (close && !disposed) props.close()
    } catch (error_) {
      if (!disposed) setError(error_ instanceof Error ? error_.message : 'The action failed. Try again.')
    } finally {
      if (!disposed) setBusy('')
    }
  }

  return (
    <Dialog title="Search Everything" size="large" footer={<Button onClick={props.close}>Close</Button>}>
      <TextInput
        label="Search Navigator"
        autofocus
        placeholder="Search Skills, Subagents, MCP and Actions"
        value={props.model.query()}
        onInput={props.model.setQuery}
        onSubmit={() => {
          const result = props.model.rows().find((item) => item.id === props.model.selected())

          if (result) void run(result)
        }}
        class="w-full"
      />
      <div style={{ margin: '8px 0' }}>
        <GuiTabs
          ui={props.ui}
          label="Search categories"
          selected={props.model.group()}
          onSelect={props.model.setGroup}
          options={props.model.groups.map((group) => ({ id: group, label: group, count: props.model.count(group) }))}
        />
      </div>
      <Show when={error()}>
        <p role="alert">{error()}</p>
      </Show>
      <Show when={props.errors.length > 0}>
        <div role="alert">
          <For each={props.errors}>{(message) => <p>{message}</p>}</For>
          <Button size="small" onClick={props.retry}>
            Retry sources
          </Button>
        </div>
      </Show>
      <ul
        ref={(node) => {
          body = node
        }}
        onScroll={(event) => props.onScroll(event.currentTarget.scrollTop)}
        style={{ margin: '0', padding: '0', 'list-style': 'none', 'max-height': '45vh', 'overflow-y': 'auto' }}
      >
        <For each={keys()} fallback={<li>No matching results.</li>}>
          {(id) => (
            <Show when={props.model.rows().find((item) => item.id === id)}>
              {(result) => (
                <GuiSearchResultRow
                  ui={props.ui}
                  result={result()}
                  selected={props.model.selected() === id}
                  busy={busy() === id}
                  favorite={props.favorite(result())}
                  focus={() => props.model.select(id)}
                  run={() => void run(result())}
                  toggleFavorite={() => props.toggleFavorite(result())}
                  information={() => props.information(result())}
                />
              )}
            </Show>
          )}
        </For>
      </ul>
    </Dialog>
  )
}
