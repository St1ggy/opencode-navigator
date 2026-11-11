import { For, Show } from 'solid-js'

import type { createMcpPresetPreview } from '../../model'

const groups = ['Changes', 'Skipped', 'Unchanged'] as const

function group(change: string) {
  if (change === 'connect' || change === 'disconnect') return 'Changes'

  return change === 'missing' || change === 'unavailable' ? 'Skipped' : 'Unchanged'
}

export function GuiMcpPreviewRows(props: { model: ReturnType<typeof createMcpPresetPreview> }) {
  return (
    <For each={groups}>
      {(section) => (
        <Show when={props.model.preview().rows.some((row) => group(row.change) === section)}>
          <section>
            <h3>{section}</h3>
            <ul style={{ padding: '0', 'list-style': 'none' }}>
              <For
                each={props.model
                  .preview()
                  .rows.filter((row) => group(row.change) === section)
                  .map((row) => row.name)}
              >
                {(name) => {
                  const row = () => props.model.preview().rows.find((item) => item.name === name)!

                  return (
                    <li style={{ padding: '6px 0', 'overflow-wrap': 'anywhere' }}>
                      <strong>{name}</strong>
                      <p style={{ margin: '2px 0', opacity: 0.65 }}>
                        {row().status ?? 'Not available'} · {row().change}
                        {row().desired ? ` · target ${row().desired}` : ' · not in preset'}
                      </p>
                    </li>
                  )
                }}
              </For>
            </ul>
          </section>
        </Show>
      )}
    </For>
  )
}
