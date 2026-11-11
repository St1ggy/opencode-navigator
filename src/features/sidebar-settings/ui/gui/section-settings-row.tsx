import { Show, createEffect, createSignal } from 'solid-js'

import { SECTION_DEFINITIONS } from '../../../../shared/config'

import type { SidebarSection } from '../../../../shared/config'
import type { GuiSettingsServices } from './settings-contract'
import type { JSX } from 'solid-js'

export function GuiSectionSettingsRow(props: GuiSettingsServices & { section: SidebarSection; handle: JSX.Element }) {
  const Row = props.ui.SettingsRow
  const Switch = props.ui.Switch
  const Button = props.ui.Button
  const TextInput = props.ui.TextInput
  const label = () => SECTION_DEFINITIONS.find((section) => section.name === props.section)?.label ?? props.section
  const [limit, setLimit] = createSignal('0')
  const valid = () => /^\d+$/.test(limit()) && Number.isSafeInteger(Number(limit()))

  createEffect(() => setLimit(String(props.preferences.selectedSectionItemLimit(props.section))))

  return (
    <Row
      title={
        <span style={{ display: 'flex', gap: '8px', 'align-items': 'center' }}>
          {props.handle}
          {label()}
        </span>
      }
      id={`navigator-section-${props.section}`}
      description={
        props.section === 'lsp'
          ? 'LSP is not exposed by this Desktop API. Its saved layout is retained for supported TUI hosts.'
          : undefined
      }
    >
      <div
        role="group"
        aria-label={`${label()} section controls`}
        style={{ display: 'flex', gap: '8px', 'align-items': 'center', 'flex-wrap': 'wrap' }}
      >
        <span style={{ display: 'flex', gap: '6px', 'align-items': 'center' }}>
          <span>Visible</span>
          <Switch
            hideLabel
            label={`Show ${label()}`}
            checked={props.preferences.selectedSections()[props.section]}
            onChange={() => props.preferences.toggleSelectedSection(props.section)}
          />
        </span>
        <span style={{ display: 'flex', gap: '6px', 'align-items': 'center' }}>
          <span>Expanded</span>
          <Switch
            hideLabel
            label={`Expand ${label()}`}
            checked={props.preferences.selectedExpanded()[props.section]}
            onChange={() => props.preferences.toggleSelectedSectionExpanded(props.section)}
          />
        </span>
        <Show when={props.section !== 'limits' && props.section !== 'lsp'}>
          <TextInput
            label={`${label()} item limit (0 for all)`}
            value={limit()}
            onInput={setLimit}
            invalid={!valid()}
          />
          <Button
            size="small"
            disabled={!valid()}
            onClick={() => props.preferences.setSectionItemLimit(props.section, Number(limit()))}
          >
            Save item limit
          </Button>
        </Show>
      </div>
    </Row>
  )
}
