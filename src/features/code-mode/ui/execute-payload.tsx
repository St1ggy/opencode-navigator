import { Show, onCleanup, untrack } from 'solid-js'

import { useDialogScroll } from '../../../shared/ui'
import { executeCodeReferences, executePayloadLabel, executeTimestamp } from '../model'

import { ExecuteReferences } from './code-references'

import type { ExecuteInspector, ExecuteRun } from '../model'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { ScrollBoxRenderable } from '@opentui/core'

export function ExecutePayload(props: {
  api: TuiPluginApi
  model: ExecuteInspector
  run: () => ExecuteRun
  height: number
  body(node: ScrollBoxRenderable): void
}) {
  const key = untrack(() => (props.model.metadata() ? 'metadata' : props.model.key()))
  const scroll = useDialogScroll(
    `execute.${key}`,
    untrack(() => props.model.position(key)),
  )
  let body: ScrollBoxRenderable | undefined

  onCleanup(() => {
    if (body && !body.isDestroyed) props.model.savePosition(key, body.scrollTop)
  })

  return (
    <scrollbox
      id="navigator.execute.payload"
      ref={(node) => {
        body = node
        scroll.ref(node)
        props.body(node)
      }}
      height={props.height}
      scrollX={false}
    >
      <Show
        when={props.model.metadata()}
        fallback={
          <Show
            when={props.model.content().available}
            fallback={
              <text fg={props.api.theme.current.textMuted}>
                {executePayloadLabel(props.model.tab())} is unavailable. This payload has not been exposed by the host.
              </text>
            }
          >
            <text wrapMode="word" fg={props.api.theme.current.text}>
              {props.model.content().text}
            </text>
          </Show>
        }
      >
        <box gap={1}>
          <ExecuteReferences api={props.api} references={executeCodeReferences(props.run().input)} />
          <text fg={props.api.theme.current.text}>Operation: {props.run().id}</text>
          <text fg={props.api.theme.current.text}>Message: {props.run().messageID}</text>
          <text fg={props.api.theme.current.textMuted}>Created: {executeTimestamp(props.run().created)}</text>
          <text fg={props.api.theme.current.textMuted}>Started: {executeTimestamp(props.run().started)}</text>
          <text fg={props.api.theme.current.textMuted}>Finished: {executeTimestamp(props.run().completed)}</text>
          <text fg={props.api.theme.current.textMuted}>
            Nested MCP calls and payloads are not exposed by this host.
          </text>
        </box>
      </Show>
    </scrollbox>
  )
}
