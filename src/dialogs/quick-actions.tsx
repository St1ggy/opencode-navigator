import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { TextAttributes, type ScrollBoxRenderable } from "@opentui/core"
import { useTerminalDimensions } from "@opentui/solid"
import { createEffect, createMemo, createSignal, For, onCleanup } from "solid-js"
import { QUICK_ACTIONS, PLUGIN_ID } from "../constants"
import type { PreferencesController } from "../controllers/preferences"
import type { QuickActionId } from "../quick-actions"

export function QuickActionsDialog(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  onBack: () => void
}) {
  const order = props.preferences.selectedQuickActionOrder
  const [selected, setSelected] = createSignal<QuickActionId>(order()[0])
  const actions = createMemo(() => order().map((id) => ({ ...QUICK_ACTIONS.find((action) => action.command === id)! })))
  const theme = () => props.api.theme.current
  const dimensions = useTerminalDimensions()
  let body: ScrollBoxRenderable | undefined
  function move(offset: number) {
    const index = order().indexOf(selected())
    setSelected(order()[(index + offset + order().length) % order().length])
  }
  const prefix = `${PLUGIN_ID}.quick-actions-settings`
  createEffect(() => {
    order()
    const id = selected()
    queueMicrotask(() => {
      if (body && !body.isDestroyed) body.scrollChildIntoView(`${prefix}.${id}`)
    })
  })
  const unregister = props.api.keymap.registerLayer({
    mode: "modal",
    priority: 1000,
    commands: [
      { name: `${prefix}.previous`, run: () => move(-1) },
      { name: `${prefix}.next`, run: () => move(1) },
      { name: `${prefix}.toggle`, run: () => props.preferences.toggleQuickAction(selected()) },
      { name: `${prefix}.up`, run: () => props.preferences.moveQuickAction(selected(), -1) },
      { name: `${prefix}.down`, run: () => props.preferences.moveQuickAction(selected(), 1) },
      { name: `${prefix}.back`, run: props.onBack },
    ],
    bindings: [
      { key: "up", cmd: `${prefix}.previous` },
      { key: "down", cmd: `${prefix}.next` },
      { key: "return", cmd: `${prefix}.toggle` },
      { key: "space", cmd: `${prefix}.toggle` },
      { key: "left", cmd: `${prefix}.up` },
      { key: "right", cmd: `${prefix}.down` },
      { key: "shift+up", cmd: `${prefix}.up` },
      { key: "shift+down", cmd: `${prefix}.down` },
      { key: "escape", cmd: `${prefix}.back` },
    ],
  })
  onCleanup(unregister)
  return (
    <box paddingLeft={2} paddingRight={2} paddingBottom={1} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme().text}>
          Quick actions
        </text>
        <text
          fg={theme().textMuted}
          onMouseUp={(event) => {
            event.stopPropagation()
            props.onBack()
          }}
        >
          Back (esc)
        </text>
      </box>
      <text fg={theme().textMuted} wrapMode="word">
        Scope: {props.preferences.preferenceScopeLabel()}. Changes save immediately.
      </text>
      <scrollbox
        ref={(node) => (body = node)}
        height={Math.min(actions().length * 2 - 1, Math.max(3, Math.floor(dimensions().height * 0.75) - 8))}
        scrollX={false}
      >
        <box gap={1}>
          <For each={actions()}>
            {(action, index) => (
              <box
                id={`${prefix}.${action.command}`}
                flexDirection="row"
                gap={1}
                paddingLeft={1}
                paddingRight={1}
                backgroundColor={selected() === action.command ? theme().backgroundElement : undefined}
                onMouseOver={() => setSelected(action.command)}
                onMouseDown={() => {
                  setSelected(action.command)
                  props.preferences.toggleQuickAction(action.command)
                }}
              >
                <text flexGrow={1} fg={theme().text}>
                  {props.preferences.selectedQuickActionVisible(action.command) ? "☑" : "☐"} {index() + 1}.{" "}
                  {action.label}
                </text>
                <text
                  fg={theme().accent}
                  onMouseDown={(event) => {
                    event.stopPropagation()
                    setSelected(action.command)
                    props.preferences.moveQuickAction(action.command, -1)
                  }}
                >
                  ↑
                </text>
                <text
                  fg={theme().accent}
                  onMouseDown={(event) => {
                    event.stopPropagation()
                    setSelected(action.command)
                    props.preferences.moveQuickAction(action.command, 1)
                  }}
                >
                  ↓
                </text>
              </box>
            )}
          </For>
        </box>
      </scrollbox>
      <text fg={theme().textMuted} wrapMode="word">
        ↑/↓ navigate · enter toggle · ←/→ or shift+↑/↓ reorder
      </text>
    </box>
  )
}
