import { useTerminalDimensions } from '@opentui/solid'
import { For, Show, createMemo } from 'solid-js'

import { DialogHeader, DialogSurface, Tab, useDialogs, useIcons } from '../../../shared/ui'
import {
  EXECUTE_PAYLOADS,
  createExecuteInspector,
  executeCodeReferences,
  executeDuration,
  executePayloadAction,
  executePayloadLabel,
} from '../model'

import { ExecuteReferences } from './code-references'
import { executeKeymap } from './execute-keymap'
import { ExecutePayload } from './execute-payload'

import type { ExecuteRun } from '../model'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { ScrollBoxRenderable } from '@opentui/core'

export function ExecuteDetails(props: { api: TuiPluginApi; run: () => ExecuteRun; now?: () => number }) {
  const dialogs = useDialogs(props.api)
  const dimensions = useTerminalDimensions()
  const icons = useIcons()
  const model = createExecuteInspector(props.run)
  const references = createMemo(() => executeCodeReferences(props.run().input))
  let body: ScrollBoxRenderable | undefined
  const navigation = executeKeymap(props.api, model, () => body)
  const now = () => props.now?.() ?? props.run().completed ?? Date.now()

  return (
    <DialogSurface api={props.api} lift>
      <DialogHeader api={props.api} title="Code Mode run" icon="mcp" onBack={dialogs.back} />
      <ExecuteReferences api={props.api} references={references()} limit={2} />
      <box flexDirection="row" justifyContent="space-between" gap={1}>
        <text fg={props.run().status === 'error' ? props.api.theme.current.error : props.api.theme.current.text}>
          <b>
            {icons.icon(
              props.run().status === 'error' ? 'error' : props.run().status === 'completed' ? 'checked' : 'pending',
            )}{' '}
            {props.run().status}
          </b>
        </text>
        <text fg={props.api.theme.current.textMuted}>{executeDuration(props.run(), now())}</text>
      </box>
      <box flexDirection="row" gap={1}>
        <For each={EXECUTE_PAYLOADS}>
          {(kind) => (
            <Tab
              api={props.api}
              selected={!model.metadata() && model.tab() === kind}
              onMouseDown={(event) => event.stopPropagation()}
              onMouseUp={(event) => {
                event.stopPropagation()
                navigation.select(kind)
              }}
            >
              {executePayloadLabel(kind)}
            </Tab>
          )}
        </For>
      </box>
      <box flexDirection="row" justifyContent="space-between" gap={1}>
        <Show
          when={model.canExpand()}
          fallback={
            <text height={1} fg={props.api.theme.current.textMuted}>
              {model.content().available ? 'Full JSON' : 'Payload unavailable'}
            </text>
          }
        >
          <Tab
            api={props.api}
            selected={model.raw()}
            onMouseDown={(event) => event.stopPropagation()}
            onMouseUp={(event) => {
              event.stopPropagation()
              navigation.view()
            }}
          >
            {executePayloadAction(model.tab(), model.raw())}
          </Tab>
        </Show>
        <Tab
          api={props.api}
          selected={model.metadata()}
          onMouseDown={(event) => event.stopPropagation()}
          onMouseUp={(event) => {
            event.stopPropagation()
            model.toggleMetadata()
          }}
        >
          Details
        </Tab>
      </box>
      <Show keyed when={model.metadata() ? 'metadata' : model.key()}>
        {(_key) => (
          <ExecutePayload
            api={props.api}
            model={model}
            run={props.run}
            height={Math.max(1, Math.min(18, dimensions().height - 23))}
            body={(node) => {
              body = node
            }}
          />
        )}
      </Show>
      <text fg={props.api.theme.current.textMuted} wrapMode="word">
        {icons.key('left/right')} tabs · {icons.key('up/down')} scroll · v JSON · i details
      </text>
      <text fg={props.api.theme.current.textMuted} wrapMode="word">
        Source references only · nested calls unconfirmed
      </text>
    </DialogSurface>
  )
}
