import { For, Show } from 'solid-js'

import { useCodeModeTui } from '../../../features/code-mode'

import { CodeModeAction } from './code-mode-action'
import { CodeModeRun } from './code-mode-run'
import { SectionTab } from './section-tab'

import type { SidebarInteraction } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function CodeModeActivity(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  navigationSection: number
  rowOffset?: number
}) {
  const model = useCodeModeTui()!
  const selected = model.tab
  const rows = () => (selected() === 'active' ? model.active() : model.recent())
  const position = (row: number, column = 0) => ({
    section: props.navigationSection,
    row: row + (props.rowOffset ?? 1),
    column,
  })

  return (
    <box gap={1}>
      <Show
        when={model?.supported}
        fallback={
          <text fg={props.api.theme.current.textMuted}>{model?.reason ?? 'Code Mode runtime is unavailable.'}</text>
        }
      >
        <Show when={!model.current()}>
          <text fg={props.api.theme.current.textMuted}>
            The selected server or session is unavailable. Reconnect before changing routing.
          </text>
        </Show>
        <box flexDirection="row" gap={1}>
          <For each={['active', 'recent'] as const}>
            {(value, index) => (
              <SectionTab
                api={props.api}
                interaction={props.interaction}
                id={`navigator.code-mode.${value}`}
                position={position(0, index())}
                label={value === 'active' ? 'Active' : 'Recent'}
                count={value === 'active' ? model.active().length : model.recent().length}
                selected={selected() === value}
                onActivate={() => model.setTab(value)}
              />
            )}
          </For>
        </box>
        <Show when={model.error()}>
          <text fg={props.api.theme.current.error}>{model.error()}</text>
        </Show>
        <For
          each={(model.showAll() ? rows() : rows().slice(0, 5)).map((run) => run.id)}
          fallback={<text fg={props.api.theme.current.textMuted}>No observed execute runs.</text>}
        >
          {(id, index) => <CodeModeRun {...props} id={id} position={position(1 + index())} />}
        </For>
        <Show when={rows().length > 5}>
          <CodeModeAction
            {...props}
            id="navigator.execute.more"
            position={position(rows().length + 2)}
            label={model.showAll() ? 'Show less' : `Show ${rows().length - 5} more…`}
            activate={model.toggleAll}
          />
        </Show>
        <CodeModeAction
          {...props}
          id="navigator.execute.refresh"
          position={position(rows().length + 3)}
          label={model.busy() ? 'Refreshing…' : 'Refresh activity'}
          disabled={model.busy()}
          activate={() => void model.refresh()}
        />
        <text fg={props.api.theme.current.textMuted}>Execute runs, not MCP call counts.</text>
      </Show>
    </box>
  )
}
