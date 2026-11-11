import { For, createEffect, createMemo, createSignal } from 'solid-js'

import type { Ui } from '@opencode/plugin/gui'

export function GuiMcpPresetMenu(props: {
  ui: Ui
  names: readonly string[]
  preview(name: string): void
  current(): boolean
  close(): void
}) {
  const Dialog = props.ui.Dialog
  const Button = props.ui.Button
  const TextInput = props.ui.TextInput
  const [query, setQuery] = createSignal('')
  const names = createMemo(() =>
    props.names.filter((name) => name.toLocaleLowerCase().includes(query().toLocaleLowerCase())),
  )

  createEffect(() => {
    if (!props.current()) props.close()
  })

  return (
    <Dialog
      title="MCP presets"
      description="Preview a preset before applying it to the current server and scope."
      footer={<Button onClick={props.close}>Cancel</Button>}
    >
      <TextInput
        label="Filter MCP presets"
        placeholder="Filter presets"
        value={query()}
        onInput={setQuery}
        autofocus
        class="w-full"
      />
      <ul style={{ margin: '8px 0', padding: '0', 'list-style': 'none' }}>
        <For each={names()} fallback={<li>No matching saved presets.</li>}>
          {(name) => (
            <li>
              <Button variant="ghost" onClick={() => props.preview(name)}>
                {name}
              </Button>
            </li>
          )}
        </For>
      </ul>
    </Dialog>
  )
}
