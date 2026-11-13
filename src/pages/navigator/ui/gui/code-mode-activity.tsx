import { For, Show } from 'solid-js'

import { GuiIconAction, GuiNotice, GuiTabs } from '../../../../shared/ui/gui'

import { GuiCodeModeRun } from './code-mode-run'
import { useNavigatorGui } from './context'
import { MonitoringSection } from './section'

export function GuiCodeModeActivity() {
  const services = useNavigatorGui()
  const model = () => services.runtime.codeMode!
  const selected = () => model().tab()
  const rows = () => (selected() === 'active' ? model().active() : model().recent())
  const keys = () => (model().showAll() ? rows() : rows().slice(0, 5)).map((row) => row.id)
  const Button = services.ui.Button

  return (
    <Show when={services.runtime.codeMode}>
      <Show when={!model().current()}>
        <GuiNotice ui={services.ui} title="Server unavailable">
          Reconnect before refreshing or changing routing.
        </GuiNotice>
      </Show>
      <div
        data-navigator-execute-tabs
        style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', gap: '8px' }}
      >
        <GuiTabs
          ui={services.ui}
          label="Code Mode activity"
          selected={selected()}
          onSelect={(value) => model().setTab(value === 'recent' ? 'recent' : 'active')}
          options={[
            { id: 'active', label: 'Active', count: model().active().length },
            { id: 'recent', label: 'Recent', count: model().recent().length },
          ]}
        />
        <GuiIconAction
          ui={services.ui}
          icon="outline-rotate-clockwise"
          label={model().busy() ? 'Refreshing activity' : 'Refresh activity'}
          disabled={model().busy() || !model().current()}
          onClick={() => void model().refresh()}
        />
      </div>
      <Show when={model().error()}>
        <GuiNotice ui={services.ui} title="Activity could not be refreshed" error>
          {model().error()}
        </GuiNotice>
      </Show>
      <ul
        style={{
          display: 'flex',
          'flex-direction': 'column',
          gap: '8px',
          margin: '8px 0',
          padding: '0',
          'list-style': 'none',
          'min-width': '0',
        }}
      >
        <For
          each={keys()}
          fallback={
            <li style={{ padding: '16px 0', color: 'var(--v2-text-text-muted)', 'font-size': '12px' }}>
              No observed execute runs in this view.
            </li>
          }
        >
          {(id) => <Show when={rows().find((run) => run.id === id)}>{(run) => <GuiCodeModeRun run={run()} />}</Show>}
        </For>
      </ul>
      <Show when={rows().length > 5}>
        <Button size="small" variant="ghost" onClick={model().toggleAll}>
          {model().showAll() ? 'Show less' : `Show ${rows().length - 5} more…`}
        </Button>
      </Show>
      <div style={{ 'font-size': '11px', color: 'var(--v2-text-text-muted)', 'margin-top': '8px' }}>
        Execute activity · not a count of nested MCP calls
      </div>
    </Show>
  )
}

export function GuiCodeModeSection() {
  return (
    <MonitoringSection id="code_mode" title="Code Mode">
      <GuiCodeModeActivity />
    </MonitoringSection>
  )
}
