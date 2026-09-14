import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { TextAttributes } from "@opentui/core"
import { createSignal, onCleanup } from "solid-js"
import { PLUGIN_ID } from "../constants"
import type { SkillInfo } from "../controllers/skills"

export function SkillDialog(props: {
  api: TuiPluginApi
  skill: SkillInfo
  onAccept: (skipConfirmation: boolean) => void
}) {
  const [skipConfirmation, setSkipConfirmation] = createSignal(false)
  const [active, setActive] = createSignal<"accept" | "cancel">("accept")
  const theme = () => props.api.theme.current

  function accept() {
    const skip = skipConfirmation()
    props.api.ui.dialog.clear()
    props.onAccept(skip)
  }

  function cancel() {
    props.api.ui.dialog.clear()
  }

  const unregister = props.api.keymap.registerLayer({
    mode: "modal",
    priority: 1000,
    commands: [
      {
        name: `${PLUGIN_ID}.skill-dialog.move`,
        run() {
          setActive((value) => (value === "accept" ? "cancel" : "accept"))
        },
      },
      {
        name: `${PLUGIN_ID}.skill-dialog.toggle-skip`,
        run() {
          setSkipConfirmation((value) => !value)
        },
      },
      {
        name: `${PLUGIN_ID}.skill-dialog.submit`,
        run() {
          if (active() === "accept") accept()
          else cancel()
        },
      },
    ],
    bindings: [
      { key: "left", cmd: `${PLUGIN_ID}.skill-dialog.move` },
      { key: "right", cmd: `${PLUGIN_ID}.skill-dialog.move` },
      { key: "tab", cmd: `${PLUGIN_ID}.skill-dialog.move` },
      { key: "space", cmd: `${PLUGIN_ID}.skill-dialog.toggle-skip` },
      { key: "return", cmd: `${PLUGIN_ID}.skill-dialog.submit` },
    ],
  })
  onCleanup(unregister)

  return (
    <box paddingLeft={2} paddingRight={2} paddingBottom={1} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme().text}>
          {props.skill.name}
        </text>
        <text fg={theme().textMuted} onMouseDown={cancel}>
          esc
        </text>
      </box>
      <scrollbox maxHeight={12} scrollbarOptions={{ visible: false }}>
        <text fg={theme().textMuted} wrapMode="word">
          {props.skill.description?.trim() || "No description available."}
        </text>
      </scrollbox>
      <box flexDirection="row" gap={1} onMouseDown={() => setSkipConfirmation((value) => !value)}>
        <text fg={skipConfirmation() ? theme().accent : theme().textMuted}>{skipConfirmation() ? "☑" : "☐"}</text>
        <text fg={theme().text}>Don't show again for this skill</text>
        <text fg={theme().textMuted}>(space)</text>
      </box>
      <box flexDirection="row" justifyContent="flex-end">
        <box
          paddingLeft={1}
          paddingRight={1}
          backgroundColor={active() === "cancel" ? theme().primary : undefined}
          onMouseOver={() => setActive("cancel")}
          onMouseDown={cancel}
        >
          <text fg={active() === "cancel" ? theme().selectedListItemText : theme().textMuted}>Cancel</text>
        </box>
        <box
          paddingLeft={1}
          paddingRight={1}
          backgroundColor={active() === "accept" ? theme().primary : undefined}
          onMouseOver={() => setActive("accept")}
          onMouseDown={accept}
        >
          <text fg={active() === "accept" ? theme().selectedListItemText : theme().textMuted}>Accept</text>
        </box>
      </box>
    </box>
  )
}
