import { Show, createEffect, createSignal } from 'solid-js'

import { SECTION_DEFINITIONS } from '../../../../shared/config'

import type { SidebarSection } from '../../../../shared/config'
import type { GuiSettingsServices } from './settings-contract'

export function GuiSectionSettingsRow(
  props: GuiSettingsServices & { section: SidebarSection; index: number; count: number },
) {
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
      title={label()}
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
        <Button
          size="small"
          disabled={props.index === 0}
          onClick={() => props.preferences.moveSelectedSection(props.section, -1)}
        >
          Move up
        </Button>
        <Button
          size="small"
          disabled={props.index === props.count - 1}
          onClick={() => props.preferences.moveSelectedSection(props.section, 1)}
        >
          Move down
        </Button>
        <Switch
          label={`Show ${label()}`}
          checked={props.preferences.selectedSections()[props.section]}
          onChange={() => props.preferences.toggleSelectedSection(props.section)}
        />
        <Switch
          label={`Expand ${label()}`}
          checked={props.preferences.selectedExpanded()[props.section]}
          onChange={() => props.preferences.toggleSelectedSectionExpanded(props.section)}
        />
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
