import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { TextAttributes } from "@opentui/core"

export function KeyboardHelpDialog(props: { api: TuiPluginApi }) {
  const theme = () => props.api.theme.current
  return (
    <box paddingLeft={2} paddingRight={2} paddingBottom={1} gap={1}>
      <text attributes={TextAttributes.BOLD} fg={theme().text}>
        Sidebar keyboard help
      </text>
      <text fg={theme().textMuted}>↑/k and ↓/j move · enter activates</text>
      <text fg={theme().textMuted}>enter on a filter starts typing · esc returns</text>
      <text fg={theme().textMuted}>esc leaves the sidebar · ? opens this help</text>
    </box>
  )
}

export function openKeyboardHelp(api: TuiPluginApi) {
  api.ui.dialog.replace(() => <KeyboardHelpDialog api={api} />)
  api.ui.dialog.setSize("medium")
}
