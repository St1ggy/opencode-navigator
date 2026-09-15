import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import type { McpController } from "../controllers/mcp"
import type { PreferencesController } from "../controllers/preferences"
import { TextAttributes, type ScrollBoxRenderable } from "@opentui/core"
import { createSignal, For, onCleanup } from "solid-js"

type PresetOption = { title: string; value: string; description: string }

export function McpPresetMenu(props: {
  api: TuiPluginApi
  title: string
  options: PresetOption[]
  onSelect: (option: PresetOption) => void
}) {
  const [active, setActive] = createSignal(0)
  const theme = () => props.api.theme.current
  let body: ScrollBoxRenderable | undefined
  const prefix = "opencode-pretty-sidebar.mcp-preset-menu"
  function move(offset: number) {
    const count = props.options.length
    if (!count) return
    const next = (active() + offset + count) % count
    setActive(next)
    body?.scrollChildIntoView(`${prefix}.${next}`)
  }
  const unregister = props.api.keymap.registerLayer({
    mode: "modal",
    priority: 1000,
    commands: [
      { name: `${prefix}.previous`, run: () => move(-1) },
      { name: `${prefix}.next`, run: () => move(1) },
      {
        name: `${prefix}.select`,
        run: () => {
          const option = props.options[active()]
          if (option) props.onSelect(option)
        },
      },
    ],
    bindings: [
      { key: "up", cmd: `${prefix}.previous` },
      { key: "down", cmd: `${prefix}.next` },
      { key: "return", cmd: `${prefix}.select` },
      { key: "space", cmd: `${prefix}.select` },
    ],
  })
  onCleanup(unregister)
  return (
    <box paddingLeft={2} paddingRight={2} paddingBottom={1} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme().text}>
          {props.title}
        </text>
        <text fg={theme().textMuted} onMouseUp={() => props.api.ui.dialog.clear()}>
          esc
        </text>
      </box>
      <scrollbox ref={(node) => (body = node)} height={Math.min(props.options.length * 3, 15)} scrollX={false}>
        <box gap={1}>
          <For each={props.options}>
            {(option, index) => (
              <box
                id={`${prefix}.${index()}`}
                paddingLeft={1}
                paddingRight={1}
                backgroundColor={active() === index() ? theme().backgroundElement : undefined}
                onMouseOver={() => setActive(index())}
                onMouseUp={(event) => {
                  event.stopPropagation()
                  props.onSelect(option)
                }}
              >
                <text
                  attributes={active() === index() ? TextAttributes.BOLD : undefined}
                  fg={theme().text}
                  wrapMode="word"
                >
                  {option.title}
                </text>
                <text fg={theme().textMuted} wrapMode="word">
                  {option.description}
                </text>
              </box>
            )}
          </For>
        </box>
      </scrollbox>
      <text fg={theme().textMuted}>↑/↓ navigate · enter select · esc close</text>
    </box>
  )
}

export function openMcpPresets(api: TuiPluginApi, controller: McpController, preferences: PreferencesController) {
  function notify(message: string) {
    api.ui.toast({ variant: "success", title: "MCP presets", message, duration: 3000 })
  }

  function prompt(value = "", renameFrom?: string) {
    api.ui.dialog.replace(() => (
      <api.ui.DialogPrompt
        title={renameFrom ? "Rename MCP preset" : "Save MCP preset"}
        description={() => <text fg={api.theme.current.textMuted}>Save the current enabled and disabled servers.</text>}
        placeholder="Preset name"
        value={value}
        onConfirm={(input) => {
          try {
            const name = renameFrom
              ? preferences.renameMcpPreset(renameFrom, input)
              : preferences.saveMcpPreset(input, controller.capturePreset())
            if (renameFrom) controller.renameSelectedPreset(renameFrom)
            notify(renameFrom ? `Renamed to ${name}` : `Saved ${name}`)
            api.ui.dialog.clear()
          } catch (cause) {
            api.ui.toast({
              variant: "error",
              title: "MCP presets",
              message: cause instanceof Error ? cause.message : "Could not save the preset",
              duration: 4000,
            })
            prompt(input, renameFrom)
          }
        }}
      />
    ))
    api.ui.dialog.setSize("medium")
  }

  function actions(name: string) {
    api.ui.dialog.replace(() => (
      <McpPresetMenu
        api={api}
        title={name}
        options={[
          { title: "Apply", value: "apply", description: "match the saved server states" },
          { title: "Update from current", value: "update", description: "replace the saved states" },
          { title: "Rename", value: "rename", description: "change the preset name" },
          { title: "Delete", value: "delete", description: "remove this preset" },
        ]}
        onSelect={(option) => {
          if (option.value === "apply") {
            const preset = preferences.mcpPresets()[name]
            api.ui.dialog.clear()
            if (preset) void controller.applyPreset(name, preset)
            return
          }
          if (option.value === "update") {
            try {
              const states = controller.capturePreset()
              if (!preferences.updateMcpPreset(name, states)) throw new Error("MCP preset no longer exists")
              controller.updateSelectedPreset(name)
              notify(`Updated ${name}`)
              api.ui.dialog.clear()
            } catch (cause) {
              api.ui.toast({
                variant: "error",
                title: "MCP presets",
                message: cause instanceof Error ? cause.message : "Could not update the preset",
                duration: 4000,
              })
              openMcpPresets(api, controller, preferences)
            }
            return
          }
          if (option.value === "rename") return prompt(name, name)
          if (!preferences.deleteMcpPreset(name)) {
            api.ui.toast({
              variant: "warning",
              title: "MCP presets",
              message: "MCP preset no longer exists",
              duration: 4000,
            })
            api.ui.dialog.clear()
            return
          }
          controller.clearSelectedPreset(name)
          notify(`Deleted ${name}`)
          api.ui.dialog.clear()
        }}
      />
    ))
    api.ui.dialog.setSize("medium")
  }

  api.ui.dialog.replace(() => (
    <McpPresetMenu
      api={api}
      title="MCP presets"
      options={[
        { title: "Save current", value: "save", description: "Create a preset from the current server states" },
        ...Object.entries(preferences.mcpPresets()).map(([name, states]) => ({
          title: name,
          value: `preset:${name}`,
          description: `${Object.values(states).filter((state) => state === "enabled").length}/${Object.keys(states).length} enabled`,
        })),
      ]}
      onSelect={(option) => (option.value === "save" ? prompt() : actions(option.value.slice("preset:".length)))}
    />
  ))
  api.ui.dialog.setSize("medium")
}
