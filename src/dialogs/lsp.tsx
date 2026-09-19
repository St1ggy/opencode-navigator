import { TextAttributes } from '@opentui/core'
import { Show, createMemo } from 'solid-js'

import { useIcons } from '../icons/context'

import { useDialogs } from './context'

import type { TuiPluginApi, TuiSidebarLspItem } from '@opencode-ai/plugin/tui'

export function LspDetailsDialog(props: { api: TuiPluginApi; server: TuiSidebarLspItem }) {
  const icons = useIcons()
  const dialogs = useDialogs(props.api)
  const current = createMemo(() =>
    props.api.state.lsp().find((item) => item.id === props.server.id && item.root === props.server.root),
  )
  const theme = () => props.api.theme.current

  return (
    <box paddingLeft={2} paddingRight={2} paddingBottom={1} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme().text} attributes={TextAttributes.BOLD}>
          {icons.icon('lsp')} LSP server
        </text>
        <text fg={theme().textMuted} onMouseUp={dialogs.back}>
          {icons.key('esc')}
        </text>
      </box>
      <text fg={theme().text} wrapMode="word">
        {props.server.id}
      </text>
      <text fg={current()?.status === 'error' ? theme().error : theme().textMuted}>
        Status: {current()?.status ?? 'not reported'}
      </text>
      <text fg={theme().textMuted} wrapMode="word">
        Root: {props.server.root}
      </text>
      <Show when={current()?.status === 'error'}>
        <text fg={theme().textMuted} wrapMode="word">
          {icons.icon('error')} Connection error. Check the LSP configuration and OpenCode logs for details.
        </text>
      </Show>
    </box>
  )
}
