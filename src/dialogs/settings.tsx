import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { type ScrollBoxRenderable, TextAttributes } from "@opentui/core"
import { useTerminalDimensions } from "@opentui/solid"
import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js"
import { PLUGIN_ID, SECTION_DEFINITIONS } from "../constants"
import type { PreferencesController } from "../controllers/preferences"
import { SIDEBAR_SECTIONS, type SidebarSection } from "../state"
import { openFirstRunWizard } from "./first-run"
import { QuickActionsDialog } from "./quick-actions"

export function SettingsDialog(props: { api: TuiPluginApi; preferences: PreferencesController; activeValue?: string }) {
  let body: ScrollBoxRenderable | undefined
  const theme = () => props.api.theme.current
  const dimensions = useTerminalDimensions()
  const bodyHeight = createMemo(() => Math.max(4, Math.floor(dimensions().height * 0.75) - 10))
  const groups = createMemo(() => [
    {
      id: "scope",
      tab: "Scope",
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
      id: "presets",
      tab: "Presets",
      title: "Layout presets",
      options: [
        ...Object.keys(props.preferences.layoutPresets())
          .sort((left, right) => left.localeCompare(right))
          .map((name) => ({
            title: `◇ ${name}`,
            value: `preset:custom:${encodeURIComponent(name)}`,
            description: "enter to apply or edit",
          })),
        {
          title: "+ Save as…",
          value: "save_preset",
          description: "create a preset from the current layout",
        },
      ],
    },
    {
      id: "sections",
      tab: "Sections",
      title: "Sections & order",
      options: props.preferences.selectedSectionOrder().map((name, index) => {
        const section = SECTION_DEFINITIONS.find((candidate) => candidate.name === name)!
        return {
          title: `${props.preferences.selectedSections()[section.name] ? "☑" : "☐"} ${index + 1}. ${section.label}`,
          value: section.name,
          description: props.preferences.selectedSections()[section.name] ? "visible" : "hidden",
        }
      }),
    },
    {
      id: "behavior",
      tab: "Behavior",
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
      id: "defaults",
      tab: "Defaults",
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
          description: "MCP memory, icons, shortcuts, limits, actions",
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
  const orderedGroups = createMemo(() =>
    ["sections", "scope", "presets", "behavior", "defaults"].map((id) => groups().find((group) => group.id === id)!),
  )
  const initialGroup = orderedGroups().find((group) =>
    group.options.some((option) => option.value === props.activeValue),
  )
  const [activeGroup, setActiveGroup] = createSignal(initialGroup?.id ?? orderedGroups()[0].id)
  const options = createMemo(() => orderedGroups().find((group) => group.id === activeGroup())?.options ?? [])
  const optionId = (value: string) => `${PLUGIN_ID}.settings.${value}`
  const initialActive = options().findIndex((option) => option.value === props.activeValue)
  const [active, setActive] = createSignal(Math.max(0, initialActive))
  const contentHeight = createMemo(() => Math.min(bodyHeight(), Math.max(1, options().length * 2 - 1)))
  const footerHint = createMemo(() => {
    const common = "tab switch · ↑/↓ navigate"
    if (activeGroup() === "sections")
      return `${common} · enter toggle · l item limit${options()[active()]?.value === "quick_actions" ? " · a actions" : ""} · ←/→ or shift+↑/↓ reorder`
    if (activeGroup() === "presets") return `${common} · enter manage`
    if (activeGroup() === "behavior") return `${common} · enter change`
    if (activeGroup() === "defaults") return `${common} · enter run`
    return `${common} · enter select`
  })

  onMount(() => {
    queueMicrotask(() => {
      const option = options()[active()]
      if (option) body?.scrollChildIntoView(optionId(option.value))
    })
  })

  function move(offset: number) {
    const next = (active() + offset + options().length) % options().length
    setActive(next)
    const option = options()[next]
    if (option) body?.scrollChildIntoView(optionId(option.value))
  }

  function switchGroup(offset: number) {
    const index = orderedGroups().findIndex((group) => group.id === activeGroup())
    const group = orderedGroups()[(index + offset + orderedGroups().length) % orderedGroups().length]
    setActiveGroup(group.id)
    setActive(0)
    queueMicrotask(() => {
      const option = options()[0]
      if (option) body?.scrollChildIntoView(optionId(option.value))
    })
  }

  function reorder(value: string | undefined, direction: -1 | 1) {
    if (!value || !SIDEBAR_SECTIONS.includes(value as SidebarSection)) return
    props.preferences.moveSelectedSection(value as SidebarSection, direction)
    queueMicrotask(() => {
      const next = options().findIndex((candidate) => candidate.value === value)
      if (next < 0) return
      setActive(next)
      body?.scrollChildIntoView(optionId(value))
    })
  }

  function openPresetPrompt(value = "", renameFrom?: string) {
    props.api.ui.dialog.replace(() => (
      <props.api.ui.DialogPrompt
        title={renameFrom ? "Rename layout preset" : "Save layout preset"}
        description={() => (
          <text fg={theme().textMuted}>Save the current visible, expanded, and ordered sections.</text>
        )}
        placeholder="Preset name"
        value={value}
        onConfirm={(input) => {
          try {
            const name = renameFrom
              ? props.preferences.renameLayoutPreset(renameFrom, input)
              : props.preferences.saveLayoutPreset(input)
            openSettings(props.api, props.preferences, `preset:custom:${encodeURIComponent(name)}`)
            props.api.ui.toast({
              variant: "success",
              title: "Layout presets",
              message: renameFrom ? `Renamed to ${name}` : `Saved ${name}`,
              duration: 3000,
            })
          } catch (error) {
            props.api.ui.toast({
              variant: "error",
              title: "Layout presets",
              message: error instanceof Error ? error.message : "Could not save the preset",
              duration: 4000,
            })
            openPresetPrompt(input, renameFrom)
          }
        }}
        onCancel={() =>
          openSettings(
            props.api,
            props.preferences,
            renameFrom ? `preset:custom:${encodeURIComponent(renameFrom)}` : "save_preset",
          )
        }
      />
    ))
    props.api.ui.dialog.setSize("medium")
  }

  function applyPreset(name: string) {
    const layout = props.preferences.layoutPresets()[name]
    if (!layout) return
    props.preferences.applyLayoutPreset(layout)
    openSettings(props.api, props.preferences, `preset:custom:${encodeURIComponent(name)}`)
    props.api.ui.toast({
      variant: "success",
      title: "Layout presets",
      message: `${name} applied to ${props.preferences.preferenceScopeLabel()}`,
      duration: 3000,
    })
  }

  function openPresetActions(name: string) {
    props.api.ui.dialog.replace(() => (
      <props.api.ui.DialogSelect
        title={name}
        skipFilter
        options={[
          { title: "Apply", value: "apply", description: "use this layout in the selected scope" },
          { title: "Update from current", value: "update", description: "replace the saved layout" },
          { title: "Rename…", value: "rename", description: "change the preset name" },
          { title: "Delete", value: "delete", description: "remove this preset" },
        ]}
        onSelect={(option) => {
          if (option.value === "apply") {
            applyPreset(name)
            return
          }
          if (option.value === "update") {
            props.preferences.updateLayoutPreset(name)
            openSettings(props.api, props.preferences, `preset:custom:${encodeURIComponent(name)}`)
            props.api.ui.toast({
              variant: "success",
              title: "Layout presets",
              message: `Updated ${name}`,
              duration: 3000,
            })
            return
          }
          if (option.value === "rename") {
            openPresetPrompt(name, name)
            return
          }
          props.preferences.deleteLayoutPreset(name)
          openSettings(props.api, props.preferences, "save_preset")
        }}
      />
    ))
    props.api.ui.dialog.setSize("medium")
  }

  function openLimitPrompt(
    section: SidebarSection,
    value = String(props.preferences.selectedSectionItemLimit(section)),
  ) {
    props.api.ui.dialog.replace(() => (
      <props.api.ui.DialogPrompt
        title={`${SECTION_DEFINITIONS.find((item) => item.name === section)!.label} item limit`}
        description={() => <text fg={theme().textMuted}>Visible items before Show all. Enter 0 for All.</text>}
        value={value}
        onConfirm={(input) => {
          try {
            if (!/^\d+$/.test(input.trim())) throw new Error("Enter a non-negative whole number (0 for All)")
            props.preferences.setSectionItemLimit(section, Number(input))
            openSettings(props.api, props.preferences, section)
          } catch (error) {
            props.api.ui.toast({
              variant: "error",
              title: "List limit",
              message: error instanceof Error ? error.message : "Invalid limit",
              duration: 4000,
            })
            openLimitPrompt(section, input)
          }
        }}
        onCancel={() => openSettings(props.api, props.preferences, section)}
      />
    ))
    props.api.ui.dialog.setSize("medium")
  }

  function select(value = options()[active()]?.value) {
    if (!value) return
    if (value === "scope:global" || value === "scope:worktree") {
      props.preferences.setPreferenceScope(value === "scope:global" ? "global" : "worktree")
      return
    }
    if (value.startsWith("preset:")) {
      const prefix = "preset:custom:"
      if (value.startsWith(prefix)) openPresetActions(decodeURIComponent(value.slice(prefix.length)))
      return
    }
    if (value === "save_preset") {
      openPresetPrompt()
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
              openSettings(props.api, props.preferences, "toggle_key")
            } catch (error) {
              props.api.ui.toast({
                variant: "error",
                title: "Sidebar shortcut",
                message: error instanceof Error ? error.message : "Invalid keybinding",
                duration: 4000,
              })
              openSettings(props.api, props.preferences, "toggle_key")
            }
          }}
          onCancel={() => openSettings(props.api, props.preferences, "toggle_key")}
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
              openSettings(props.api, props.preferences, "focus_key")
            } catch (error) {
              props.api.ui.toast({
                variant: "error",
                title: "Focus shortcut",
                message: error instanceof Error ? error.message : "Invalid keybinding",
                duration: 4000,
              })
              openSettings(props.api, props.preferences, "focus_key")
            }
          }}
          onCancel={() => openSettings(props.api, props.preferences, "focus_key")}
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

  function openQuickActions() {
    props.api.ui.dialog.replace(() => (
      <QuickActionsDialog
        api={props.api}
        preferences={props.preferences}
        onBack={() => openSettings(props.api, props.preferences, "quick_actions")}
      />
    ))
    props.api.ui.dialog.setSize("medium")
  }

  const unregister = props.api.keymap.registerLayer({
    mode: "modal",
    priority: 1000,
    commands: [
      { name: `${PLUGIN_ID}.settings.previous`, run: () => move(-1) },
      { name: `${PLUGIN_ID}.settings.next`, run: () => move(1) },
      { name: `${PLUGIN_ID}.settings.select`, run: () => select() },
      {
        name: `${PLUGIN_ID}.settings.quick-actions`,
        run: () => {
          if (activeGroup() === "sections" && options()[active()]?.value === "quick_actions") openQuickActions()
        },
      },
      {
        name: `${PLUGIN_ID}.settings.item-limit`,
        run: () => {
          const section = options()[active()]?.value as SidebarSection
          if (activeGroup() === "sections" && SIDEBAR_SECTIONS.includes(section)) openLimitPrompt(section)
        },
      },
      { name: `${PLUGIN_ID}.settings.previous-tab`, run: () => switchGroup(-1) },
      { name: `${PLUGIN_ID}.settings.next-tab`, run: () => switchGroup(1) },
      { name: `${PLUGIN_ID}.settings.move-up`, run: () => reorder(options()[active()]?.value, -1) },
      { name: `${PLUGIN_ID}.settings.move-down`, run: () => reorder(options()[active()]?.value, 1) },
    ],
    bindings: [
      { key: "up", cmd: `${PLUGIN_ID}.settings.previous` },
      { key: "down", cmd: `${PLUGIN_ID}.settings.next` },
      { key: "tab", cmd: `${PLUGIN_ID}.settings.next-tab` },
      { key: "shift+tab", cmd: `${PLUGIN_ID}.settings.previous-tab` },
      { key: "space", cmd: `${PLUGIN_ID}.settings.select` },
      { key: "return", cmd: `${PLUGIN_ID}.settings.select` },
      { key: "l", cmd: `${PLUGIN_ID}.settings.item-limit` },
      { key: "a", cmd: `${PLUGIN_ID}.settings.quick-actions` },
      { key: "left", cmd: `${PLUGIN_ID}.settings.move-up` },
      { key: "right", cmd: `${PLUGIN_ID}.settings.move-down` },
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
      <box flexDirection="row" gap={1}>
        <For each={orderedGroups()}>
          {(group) => (
            <box
              paddingLeft={1}
              paddingRight={1}
              backgroundColor={activeGroup() === group.id ? theme().backgroundElement : undefined}
              onMouseDown={() => {
                setActiveGroup(group.id)
                setActive(0)
              }}
            >
              <text
                attributes={activeGroup() === group.id ? TextAttributes.BOLD : undefined}
                fg={activeGroup() === group.id ? theme().accent : theme().textMuted}
              >
                {group.tab}
              </text>
            </box>
          )}
        </For>
      </box>
      <scrollbox
        ref={(node) => (body = node)}
        height={contentHeight()}
        scrollX={false}
        verticalScrollbarOptions={{ visible: true }}
        horizontalScrollbarOptions={{ visible: false }}
      >
        <box gap={1}>
          <For each={options()}>
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
                  <text flexShrink={0} attributes={selected() ? TextAttributes.BOLD : undefined} fg={theme().text}>
                    {option.title}
                  </text>
                  <text flexGrow={1} fg={theme().borderSubtle}>
                    {option.description}
                  </text>
                  <Show when={SIDEBAR_SECTIONS.includes(option.value as SidebarSection)}>
                    <box flexDirection="row" flexShrink={0} gap={1}>
                      <Show when={option.value === "quick_actions"}>
                        <text
                          fg={theme().accent}
                          onMouseDown={(event) => event.stopPropagation()}
                          onMouseUp={(event) => {
                            event.stopPropagation()
                            openQuickActions()
                          }}
                        >
                          Actions
                        </text>
                      </Show>
                      <text
                        fg={theme().accent}
                        onMouseDown={(event) => event.stopPropagation()}
                        onMouseUp={(event) => {
                          event.stopPropagation()
                          openLimitPrompt(option.value as SidebarSection)
                        }}
                      >
                        Items: {props.preferences.selectedSectionItemLimit?.(option.value as SidebarSection) || "All"}
                      </text>
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
      </scrollbox>
      <text fg={theme().textMuted}>{footerHint()}</text>
    </box>
  )
}

export function openSettings(api: TuiPluginApi, preferences: PreferencesController, activeValue?: string) {
  api.ui.dialog.replace(() => <SettingsDialog api={api} preferences={preferences} activeValue={activeValue} />)
  api.ui.dialog.setSize("xlarge")
}
