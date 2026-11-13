import { For, Show } from 'solid-js'

import { SECTION_DEFINITIONS } from '../../../../shared/config'
import { GuiChangeValue } from '../../../../shared/ui/gui'

import type { createWorkspacePresetPreview } from '../../model'
import type { Ui } from '@opencode/plugin/gui'

type Row = NonNullable<ReturnType<ReturnType<typeof createWorkspacePresetPreview>['layout']['preview']>>['rows'][number]
const changed = (row: Row) =>
  row.visibility[0] !== row.visibility[1] ||
  row.expansion[0] !== row.expansion[1] ||
  row.position[0] !== row.position[1]

export function GuiLayoutPreviewRows(props: { ui: Ui; rows: Row[] }) {
  const Section = props.ui.SettingsSection
  const SettingsRow = props.ui.SettingsRow

  return (
    <For each={[true, false]}>
      {(changes) => (
        <Show when={props.rows.some((row) => changed(row) === changes)}>
          <Section title={changes ? 'Layout changes' : 'Unchanged sections'}>
            <For each={props.rows.filter((row) => changed(row) === changes)}>
              {(row) => (
                <SettingsRow
                  title={SECTION_DEFINITIONS.find((section) => section.name === row.section)?.label ?? row.section}
                  description={
                    <span style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '4px 12px' }}>
                      <GuiChangeValue
                        ui={props.ui}
                        before={row.visibility[0] ? 'Visible' : 'Hidden'}
                        after={row.visibility[1] ? 'Visible' : 'Hidden'}
                      />
                      <GuiChangeValue
                        ui={props.ui}
                        before={row.expansion[0] ? 'Expanded' : 'Collapsed'}
                        after={row.expansion[1] ? 'Expanded' : 'Collapsed'}
                      />
                    </span>
                  }
                >
                  <span style={{ 'font-size': '12px' }}>
                    Position{' '}
                    <GuiChangeValue ui={props.ui} before={String(row.position[0])} after={String(row.position[1])} />
                  </span>
                </SettingsRow>
              )}
            </For>
          </Section>
        </Show>
      )}
    </For>
  )
}
