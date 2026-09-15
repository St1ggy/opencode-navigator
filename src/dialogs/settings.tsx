import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { type ScrollBoxRenderable, TextAttributes } from "@opentui/core"
import { useTerminalDimensions } from "@opentui/solid"
import { createMemo, createSignal, For, onCleanup, Show } from "solid-js"
import { PLUGIN_ID, SECTION_DEFINITIONS } from "../constants"
import type { PreferencesController } from "../controllers/preferences"
import { SIDEBAR_SECTIONS, type SidebarSection } from "../state"
import { openFirstRunWizard } from "./first-run"

export function SettingsDialog(props: { api: TuiPluginApi; preferences: PreferencesController }) {
  let body: ScrollBoxRenderable | undefined
  const [active, setActive] = createSignal(0)
  const theme = () => props.api.theme.current
  const dimensions = useTerminalDimensions()
  const bodyHeight = createMemo(() => Math.max(4, dimensions().height - 9))
  const groups = createMemo(() => [
    {
      title: "Preference scope",
      options: [
        {
          title: `${props.preferences.preferenceScope() === "global" ? "●" : "○"} Global`,
          value: "scope:global",
          description: "applies to every worktree",
        },
        {
          title: `${props.preferences.preferenceScope() === "worktree" ? "●" : "○"} Current worktree`,
          value: "scope:worktree",
          description: props.preferences.canUseWorktreeScope()
            ? props.preferences.preferenceScopeLabel()
            : "unavailable outside a worktree",
        },
      ],
    },
    {
      title: "Sections",
      options: props.preferences.selectedSectionOrder().map((name) => {
        const section = SECTION_DEFINITIONS.find((candidate) => candidate.name === name)!
        return {
          title: `${props.preferences.selectedSections()[section.name] ? "☑" : "☐"} ${section.label}`,
          value: section.name,
          description: props.preferences.selectedSections()[section.name] ? "visible" : "hidden",
        }
      }),
    },
    {
      title: "Section order",
      options: props.preferences.selectedSectionOrder().map((name, index) => {
        const section = SECTION_DEFINITIONS.find((candidate) => candidate.name === name)!
        return {
          title: `${index + 1}. ${section.label}`,
          value: `order:${name}`,
          description: "return moves down · shift+↑/↓ reorders",
        }
      }),
    },
    {
      title: "Behavior",
      options: [
        {
          title: `${props.preferences.selectedPersistMcp() ? "☑" : "☐"} Remember MCP states`,
          value: "persist_mcp",
          description: props.preferences.selectedPersistMcp() ? "on" : "off",
        },
        {
          title: "LSP icon style",
          value: "lsp_icon_style",
          description: props.preferences.selectedLspIconStyle() === "nerd" ? "Nerd Font" : "text badges",
        },
        {
          title: "Sidebar shortcut",
          value: "toggle_key",
          description: props.preferences.selectedToggleKey(),
        },
        {
          title: "Focus shortcut",
          value: "focus_key",
          description: props.preferences.selectedFocusKey(),
        },
      ],
    },
    {
      title: "Defaults & help",
      options: [
        {
          title: "↓ Save current layout as default",
          value: "save_layout",
          description: `${SIDEBAR_SECTIONS.filter((name) => props.preferences.selectedSections()[name]).length} visible · ${
            SIDEBAR_SECTIONS.filter((name) => props.preferences.selectedExpanded()[name]).length
          } expanded`,
        },
        {
          title: "↺ Restore configured layout",
          value: "reset_sections",
          description: "visibility and expansion",
        },
        {
          title: "↺ Restore configured behavior",
          value: "reset_settings",
          description: "MCP memory, icons, shortcuts",
        },
        {
          title: "↺ Clear remembered MCP states",
          value: "reset_mcp",
          description: `scope: ${props.preferences.preferenceScopeLabel()}`,
        },
        {
          title: "↺ Show skill confirmations again",
          value: "reset_skills",
          description: `${props.preferences.skippedSkillCount()} skipped`,
        },
        {
          title: "? Open quick setup guide",
          value: "wizard",
          description: "tips and section settings",
        },
      ],
    },
  ])
  const options = createMemo(() => groups().flatMap((group) => group.options))
  const optionId = (value: string) => `${PLUGIN_ID}.settings.${value}`

  function move(offset: number) {
    const next = (active() + offset + options().length) % options().length
    setActive(next)
    const option = options()[next]
    if (option) body?.scrollChildIntoView(optionId(option.value))
  }

  function reorder(value: string | undefined, direction: -1 | 1) {
    if (!value?.startsWith("order:")) return
    props.preferences.moveSelectedSection(value.slice("order:".length) as SidebarSection, direction)
    queueMicrotask(() => {
      const next = options().findIndex((candidate) => candidate.value === value)
      if (next < 0) return
      setActive(next)
      body?.scrollChildIntoView(optionId(value))
    })
  }

  function select(value = options()[active()]?.value) {
    if (!value) return
    if (value === "scope:global" || value === "scope:worktree") {
      props.preferences.setPreferenceScope(value === "scope:global" ? "global" : "worktree")
      return
    }
    if (value.startsWith("order:")) {
      reorder(value, 1)
      return
    }
    if (value === "save_layout") {
      void props.preferences
        .saveLayoutAsDefault()
        .then(() => {
          props.api.ui.toast({
            variant: "success",
            title: "Sidebar settings",
            message: "Current layout saved as default",
            duration: 3000,
          })
        })
        .catch((error) => {
          props.api.ui.toast({
            variant: "error",
            title: "Sidebar settings",
            message: error instanceof Error ? error.message : "Failed to save the default layout",
            duration: 5000,
          })
        })
      return
    }
    if (value === "reset_sections") {
      props.preferences.resetSections()
      return
    }
    if (value === "persist_mcp") {
      props.preferences.toggleMcpPersistence()
      return
    }
    if (value === "lsp_icon_style") {
      props.preferences.toggleLspIconStyle()
      return
    }
    if (value === "toggle_key") {
      props.api.ui.dialog.replace(() => (
        <props.api.ui.DialogPrompt
          title="Sidebar shortcut"
          description={() => <text fg={theme().textMuted}>Use OpenCode key syntax, for example alt+s.</text>}
          value={props.preferences.selectedToggleKey()}
          onConfirm={(input) => {
            try {
              props.preferences.setToggleKey(input)
              openSettings(props.api, props.preferences)
            } catch (error) {
              props.api.ui.toast({
                variant: "error",
                title: "Sidebar shortcut",
                message: error instanceof Error ? error.message : "Invalid keybinding",
                duration: 4000,
              })
              openSettings(props.api, props.preferences)
            }
          }}
          onCancel={() => openSettings(props.api, props.preferences)}
        />
      ))
      props.api.ui.dialog.setSize("medium")
      return
    }
    if (value === "focus_key") {
      props.api.ui.dialog.replace(() => (
        <props.api.ui.DialogPrompt
          title="Focus shortcut"
          description={() => <text fg={theme().textMuted}>Use OpenCode key syntax, for example alt+f.</text>}
          value={props.preferences.selectedFocusKey()}
          onConfirm={(input) => {
            try {
              props.preferences.setFocusKey(input)
              openSettings(props.api, props.preferences)
            } catch (error) {
              props.api.ui.toast({
                variant: "error",
                title: "Focus shortcut",
                message: error instanceof Error ? error.message : "Invalid keybinding",
                duration: 4000,
              })
              openSettings(props.api, props.preferences)
            }
          }}
          onCancel={() => openSettings(props.api, props.preferences)}
        />
      ))
      props.api.ui.dialog.setSize("medium")
      return
    }
    if (value === "reset_settings") {
      props.preferences.resetPluginSettings()
      return
    }
    if (value === "reset_mcp") {
      props.preferences.resetMcpStates()
      return
    }
    if (value === "reset_skills") {
      props.preferences.resetSkillConfirmations()
      return
    }
    if (value === "wizard") {
      openFirstRunWizard(props.api, props.preferences)
      return
    }
    props.preferences.toggleSelectedSection(value as SidebarSection)
  }

  const unregister = props.api.keymap.registerLayer({
    mode: "modal",
    priority: 1000,
    commands: [
      { name: `${PLUGIN_ID}.settings.previous`, run: () => move(-1) },
      { name: `${PLUGIN_ID}.settings.next`, run: () => move(1) },
      { name: `${PLUGIN_ID}.settings.select`, run: () => select() },
      { name: `${PLUGIN_ID}.settings.move-up`, run: () => reorder(options()[active()]?.value, -1) },
      { name: `${PLUGIN_ID}.settings.move-down`, run: () => reorder(options()[active()]?.value, 1) },
    ],
    bindings: [
      { key: "up", cmd: `${PLUGIN_ID}.settings.previous` },
      { key: "down", cmd: `${PLUGIN_ID}.settings.next` },
      { key: "tab", cmd: `${PLUGIN_ID}.settings.next` },
      { key: "space", cmd: `${PLUGIN_ID}.settings.select` },
      { key: "return", cmd: `${PLUGIN_ID}.settings.select` },
      { key: "shift+up", cmd: `${PLUGIN_ID}.settings.move-up` },
      { key: "shift+down", cmd: `${PLUGIN_ID}.settings.move-down` },
    ],
  })
  onCleanup(unregister)

  return (
    <box paddingLeft={2} paddingRight={2} paddingBottom={1} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme().text}>
          Sidebar settings
        </text>
        <text fg={theme().textMuted} onMouseDown={() => props.api.ui.dialog.clear()}>
          esc
        </text>
      </box>
      <text fg={theme().textMuted}>Adjust sections and behavior. Changes apply immediately.</text>
      <scrollbox
        ref={(node) => (body = node)}
        maxHeight={bodyHeight()}
        scrollX={false}
        verticalScrollbarOptions={{ visible: true }}
        horizontalScrollbarOptions={{ visible: false }}
      >
        <box gap={1}>
          <For each={groups()}>
            {(group) => (
              <box>
                <text attributes={TextAttributes.BOLD} fg={theme().accent}>
                  {group.title}
                </text>
                <box gap={1}>
                  <For each={group.options}>
                    {(option) => {
                      const index = () => options().findIndex((candidate) => candidate.value === option.value)
                      const selected = () => active() === index()
                      return (
                        <box
                          id={optionId(option.value)}
                          flexDirection="row"
                          gap={2}
                          paddingLeft={1}
                          paddingRight={1}
                          backgroundColor={selected() ? theme().backgroundElement : undefined}
                          onMouseOver={() => setActive(index())}
                          onMouseDown={() => select(option.value)}
                        >
                          <text
                            flexShrink={0}
                            attributes={selected() ? TextAttributes.BOLD : undefined}
                            fg={theme().text}
                          >
                            {option.title}
                          </text>
                          <text flexGrow={1} fg={theme().borderSubtle}>
                            {option.description}
                          </text>
                          <Show when={option.value.startsWith("order:")}>
                            <box flexDirection="row" flexShrink={0} gap={1}>
                              <text
                                fg={theme().accent}
                                onMouseDown={(event) => {
                                  event.stopPropagation()
                                  reorder(option.value, -1)
                                }}
                              >
                                ↑
                              </text>
                              <text
                                fg={theme().accent}
                                onMouseDown={(event) => {
                                  event.stopPropagation()
                                  reorder(option.value, 1)
                                }}
                              >
                                ↓
                              </text>
                            </box>
                          </Show>
                        </box>
                      )
                    }}
                  </For>
                </box>
              </box>
            )}
          </For>
        </box>
      </scrollbox>
      <text fg={theme().textMuted}>↑/↓ navigate · enter select · shift+↑/↓ reorder</text>
    </box>
  )
}

export function openSettings(api: TuiPluginApi, preferences: PreferencesController) {
  api.ui.dialog.replace(() => <SettingsDialog api={api} preferences={preferences} />)
  api.ui.dialog.setSize("xlarge")
}
