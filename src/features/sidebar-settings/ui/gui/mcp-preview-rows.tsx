import { For, Show } from 'solid-js'

import { GuiChangeValue } from '../../../../shared/ui/gui'

import type { createMcpPresetPreview } from '../../model'
import type { Ui } from '@opencode/plugin/gui'

const groups = ['Changes', 'Skipped', 'Unchanged'] as const
const labels: Record<string, string> = {
  connect: 'Connect',
  disconnect: 'Disconnect',
  missing: 'Server absent',
  unavailable: 'Unavailable',
  unchanged: 'Unchanged',
}

function group(change: string) {
  if (change === 'connect' || change === 'disconnect') return 'Changes'

  return change === 'missing' || change === 'unavailable' ? 'Skipped' : 'Unchanged'
}

export function GuiMcpPreviewRows(props: { ui: Ui; model: ReturnType<typeof createMcpPresetPreview> }) {
  const Section = props.ui.SettingsSection
  const Row = props.ui.SettingsRow

  return (
    <For each={groups}>
      {(section) => (
        <Show when={props.model.preview().rows.some((row) => group(row.change) === section)}>
          <Section title={section}>
            <For
              each={props.model
                .preview()
                .rows.filter((row) => group(row.change) === section)
                .map((row) => row.name)}
            >
              {(name) => {
                const row = () => props.model.preview().rows.find((item) => item.name === name)!

                return (
                  <Row
                    title={<span style={{ 'overflow-wrap': 'anywhere' }}>{name}</span>}
                    description={
                      row().change === 'missing'
                        ? 'Not present on this server. No connection action will run.'
                        : row().change === 'unavailable'
                          ? 'The current host state does not allow this action.'
                          : undefined
                    }
                  >
                    <Show
                      when={row().change === 'connect' || row().change === 'disconnect'}
                      fallback={
                        <span style={{ color: 'var(--v2-text-text-muted)', 'font-size': '12px' }}>
                          {labels[row().change]}
                        </span>
                      }
                    >
                      <GuiChangeValue
                        ui={props.ui}
                        before={row().status ?? 'Unknown'}
                        after={row().desired === 'enabled' ? 'Connected' : 'Disconnected'}
                      />
                    </Show>
                  </Row>
                )
              }}
            </For>
          </Section>
        </Show>
      )}
    </For>
  )
}
