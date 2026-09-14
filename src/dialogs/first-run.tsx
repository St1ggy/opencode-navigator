import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { TextAttributes } from "@opentui/core"
import { createSignal, For, onCleanup } from "solid-js"
import { PLUGIN_ID, SECTION_DEFINITIONS } from "../constants"
import type { PreferencesController } from "../controllers/preferences"

export function FirstRunWizard(props: { api: TuiPluginApi; preferences: PreferencesController }) {
  const [active, setActive] = createSignal(0)
  const theme = () => props.api.theme.current
  const finishIndex = SECTION_DEFINITIONS.length

  function finish() {
    props.api.ui.dialog.clear()
  }

  function move(offset: number) {
    setActive((value) => (value + offset + finishIndex + 1) % (finishIndex + 1))
  }

  function select() {
    const index = active()
    if (index === finishIndex) finish()
    else props.preferences.toggleSection(SECTION_DEFINITIONS[index].name)
  }

  const unregister = props.api.keymap.registerLayer({
    mode: "modal",
    priority: 1000,
    commands: [
      {
        name: `${PLUGIN_ID}.wizard.previous`,
        run() {
          move(-1)
        },
      },
      {
        name: `${PLUGIN_ID}.wizard.next`,
        run() {
          move(1)
        },
      },
      {
        name: `${PLUGIN_ID}.wizard.select`,
        run: select,
      },
    ],
    bindings: [
      { key: "up", cmd: `${PLUGIN_ID}.wizard.previous` },
      { key: "down", cmd: `${PLUGIN_ID}.wizard.next` },
      { key: "tab", cmd: `${PLUGIN_ID}.wizard.next` },
      { key: "space", cmd: `${PLUGIN_ID}.wizard.select` },
      { key: "return", cmd: `${PLUGIN_ID}.wizard.select` },
    ],
  })
  onCleanup(unregister)

  return (
    <box paddingLeft={2} paddingRight={2} paddingBottom={1} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme().text}>
          Welcome to Pretty Sidebar
        </text>
        <text fg={theme().textMuted} onMouseDown={finish}>
          esc
        </text>
      </box>
      <text fg={theme().textMuted} wrapMode="word">
        Choose what appears in your sidebar. You can change these settings anytime with the gear button.
      </text>
      <box flexDirection="row" gap={2}>
        <text fg={theme().textMuted}>Toggle: {props.preferences.toggleKey()}</text>
        <text fg={theme().textMuted}>Focus: {props.preferences.focusKey()}</text>
        <text fg={theme().textMuted}>
          LSP icons: {props.preferences.lspIconStyle() === "text" ? "text badges" : "Nerd Font"}
        </text>
      </box>
      <text fg={theme().textMuted} wrapMode="word">
        Focus the sidebar to navigate with arrows or j/k, activate with enter, and leave with escape.
      </text>
      <For each={SECTION_DEFINITIONS}>
        {(section, index) => {
          const selected = () => active() === index()
          return (
            <box
              flexDirection="row"
              gap={1}
              paddingLeft={1}
              paddingRight={1}
              backgroundColor={selected() ? theme().backgroundElement : undefined}
              onMouseOver={() => setActive(index())}
              onMouseDown={() => props.preferences.toggleSection(section.name)}
            >
              <text flexShrink={0} fg={props.preferences.sections()[section.name] ? theme().accent : theme().textMuted}>
                {props.preferences.sections()[section.name] ? "☑" : "☐"}
              </text>
              <text fg={selected() ? theme().text : theme().textMuted}>{section.label}</text>
            </box>
          )
        }}
      </For>
      <box flexDirection="row" justifyContent="flex-end">
        <box
          paddingLeft={2}
          paddingRight={2}
          backgroundColor={active() === finishIndex ? theme().primary : undefined}
          onMouseOver={() => setActive(finishIndex)}
          onMouseDown={finish}
        >
          <text fg={active() === finishIndex ? theme().selectedListItemText : theme().textMuted}>Finish</text>
        </box>
      </box>
    </box>
  )
}

export function openFirstRunWizard(api: TuiPluginApi, preferences: PreferencesController) {
  api.ui.dialog.replace(() => <FirstRunWizard api={api} preferences={preferences} />)
}

export async function showFirstRunWizard(api: TuiPluginApi, preferences: PreferencesController) {
  if (!(await preferences.claimFirstRun())) return false
  openFirstRunWizard(api, preferences)
  return true
}
