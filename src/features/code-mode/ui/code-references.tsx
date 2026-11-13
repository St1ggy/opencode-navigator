import { For, Show, createMemo } from 'solid-js'

import { useIcons } from '../../../shared/ui'
import { executeReferenceView } from '../model'

import type { ExecuteCodeReferences } from '../model'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { RGBA } from '@opentui/core'

export function ExecuteReferences(props: {
  api: TuiPluginApi
  references: ExecuteCodeReferences
  limit?: number
  foreground?: RGBA
  muted?: RGBA
  showOrigin?: boolean
}) {
  const icons = useIcons()
  const view = createMemo(() => executeReferenceView(props.references, props.limit, props.showOrigin !== false))

  return (
    <box minWidth={0}>
      <For
        each={view().visible}
        fallback={
          <text height={1} wrapMode="none" truncate fg={props.foreground ?? props.api.theme.current.text}>
            MCP / method not identified
          </text>
        }
      >
        {(item) => (
          <text height={1} wrapMode="none" truncate fg={props.foreground ?? props.api.theme.current.text}>
            {item.namespace} {icons.icon('right')} {item.method}
          </text>
        )}
      </For>
      <Show when={view().caption}>
        <text height={1} wrapMode="none" truncate fg={props.muted ?? props.api.theme.current.textMuted}>
          {view().caption}
        </text>
      </Show>
    </box>
  )
}
