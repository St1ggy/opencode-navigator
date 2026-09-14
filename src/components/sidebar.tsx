import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import type { BoxRenderable } from "@opentui/core"
import { createEffect, createMemo, createSignal, onCleanup, Show } from "solid-js"
import { FOCUS_COMMAND, PLUGIN_ID, TOGGLE_COMMAND } from "../constants"
import type { McpController } from "../controllers/mcp"
import type { PreferencesController } from "../controllers/preferences"
import type { SkillController } from "../controllers/skills"
import type { SubagentController } from "../controllers/subagents"
import type { TodoController } from "../controllers/todo"
import { showFirstRunWizard } from "../dialogs/first-run"
import { openSettings } from "../dialogs/settings"
import type { SidebarInteraction } from "../sidebar-interaction"
import { useSidebarItem } from "./common"
import { LspSection, McpSection, QuickActionsSection, SkillsSection, SubagentSection, TodoSection } from "./sections"

export function SidebarTitle(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  interaction: SidebarInteraction
  sessionID: string
  title: string
}) {
  const theme = () => props.api.theme.current
  const status = createMemo(() => props.api.state.session.status(props.sessionID)?.type)
  const [settingsHover, setSettingsHover] = createSignal(false)
  const settingsId = `${PLUGIN_ID}.settings`
  const settings = useSidebarItem(props.api, props.interaction, {
    id: settingsId,
    order: 0,
    activate: () => openSettings(props.api, props.preferences),
  })
  onCleanup(() => props.interaction.setTitleRoot(undefined))

  return (
    <box
      ref={(node: BoxRenderable) => props.interaction.setTitleRoot(node)}
      border={["bottom"]}
      borderColor={theme().borderSubtle}
      paddingBottom={1}
      paddingRight={1}
    >
      <box flexDirection="row" justifyContent="space-between" gap={1}>
        <box flexDirection="row" gap={1} flexGrow={1}>
          <text flexShrink={0} fg={status() === "busy" ? theme().primary : theme().accent}>
            {status() === "busy" ? "●" : "◆"}
          </text>
          <text fg={theme().text} wrapMode="word">
            <b>{props.title}</b>
          </text>
        </box>
        <box
          ref={(node: BoxRenderable) => settings.ref(node)}
          id={settingsId}
          flexShrink={0}
          alignSelf="flex-start"
          height={1}
          paddingLeft={1}
          paddingRight={1}
          backgroundColor={settings.backgroundColor()}
          onMouseOver={() => {
            setSettingsHover(true)
            settings.onMouseOver()
          }}
          onMouseOut={() => {
            setSettingsHover(false)
            settings.onMouseOut()
          }}
          onMouseUp={(event) => settings.activate(event)}
        >
          <text
            fg={settings.focused() ? settings.foregroundColor() : settingsHover() ? theme().accent : theme().textMuted}
          >
            ⚙
          </text>
        </box>
      </box>
    </box>
  )
}

export function SidebarContent(props: {
  api: TuiPluginApi
  mcp: McpController
  todo: TodoController
  subagents: SubagentController
  skills: SkillController
  preferences: PreferencesController
  interaction: SidebarInteraction
  sessionID: string
}) {
  const sections = props.preferences.sections
  onCleanup(() => props.interaction.setContentRoot(undefined))

  return (
    <box
      ref={(node: BoxRenderable) => props.interaction.setContentRoot(node)}
      id={`${PLUGIN_ID}.root`}
      focusable
      gap={1}
      on:focused={props.interaction.syncFocus}
      on:blurred={props.interaction.syncFocus}
      onKeyDown={(event) => {
        if (event.name !== "escape" || event.defaultPrevented) return
        event.preventDefault()
        event.stopPropagation()
        props.interaction.leave()
      }}
    >
      <Show when={sections().todo}>
        <TodoSection
          api={props.api}
          controller={props.todo}
          preferences={props.preferences}
          interaction={props.interaction}
          sessionID={props.sessionID}
        />
      </Show>
      <Show when={sections().subagents}>
        <SubagentSection
          api={props.api}
          controller={props.subagents}
          preferences={props.preferences}
          interaction={props.interaction}
          sessionID={props.sessionID}
        />
      </Show>
      <Show when={sections().skills}>
        <SkillsSection
          api={props.api}
          controller={props.skills}
          preferences={props.preferences}
          interaction={props.interaction}
        />
      </Show>
      <Show when={sections().quick_actions}>
        <QuickActionsSection api={props.api} preferences={props.preferences} interaction={props.interaction} />
      </Show>
      <Show when={sections().lsp}>
        <LspSection
          api={props.api}
          iconStyle={props.preferences.lspIconStyle()}
          preferences={props.preferences}
          interaction={props.interaction}
        />
      </Show>
      <Show when={sections().mcp}>
        <McpSection
          api={props.api}
          controller={props.mcp}
          preferences={props.preferences}
          interaction={props.interaction}
        />
      </Show>
    </box>
  )
}

export function McpPersistence(props: { api: TuiPluginApi; controller: McpController }) {
  createEffect(() => {
    if (!props.api.state.ready) return
    props.controller.persist()
    const route = props.api.route.current
    const params = "params" in route ? route.params : undefined
    if (typeof params?.sessionID !== "string") return
    const current = props.controller.target()
    void props.controller.activate(current).catch(() => {})
  })
  return <></>
}

export function PreferencesPersistence(props: { api: TuiPluginApi; controller: PreferencesController }) {
  createEffect(() => {
    void props.controller.load()
  })
  return <></>
}

export function SidebarToggleBinding(props: { api: TuiPluginApi; preferences: PreferencesController }) {
  createEffect(() => {
    const key = props.preferences.toggleKey()
    const unregister = props.api.keymap.registerLayer({
      commands: [
        {
          name: TOGGLE_COMMAND,
          title: "Toggle sidebar",
          category: "Sidebar",
          namespace: "palette",
          enabled: () => props.api.route.current.name === "session",
          run() {
            props.api.keymap.dispatchCommand("session.sidebar.toggle")
          },
        },
      ],
      bindings: [{ key, cmd: TOGGLE_COMMAND, desc: "Toggle sidebar" }],
    })
    onCleanup(unregister)
  })
  return <></>
}

export function SidebarFocusBinding(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  interaction: SidebarInteraction
}) {
  const unregisterCommands = props.api.keymap.registerLayer({
    commands: props.interaction.baseCommands(),
  })
  onCleanup(unregisterCommands)

  createEffect(() => {
    const key = props.preferences.focusKey()
    const unregister = props.api.keymap.registerLayer({
      bindings: [{ key, cmd: FOCUS_COMMAND, desc: "Focus sidebar" }],
    })
    onCleanup(unregister)
  })
  return <></>
}

export function FirstRunWizardPersistence(props: { api: TuiPluginApi; preferences: PreferencesController }) {
  let checked = false
  createEffect(() => {
    if (checked) return
    checked = true
    void showFirstRunWizard(props.api, props.preferences).catch(() => {})
  })
  return <></>
}
