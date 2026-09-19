import { For, Match, Show, Switch, createEffect, createMemo, onCleanup, untrack } from 'solid-js'

import { FOCUS_COMMAND, LEGACY_PLUGIN_ID, PLUGIN_ID, TOGGLE_COMMAND } from '../constants'
import { showFirstRunWizard } from '../dialogs/first-run'
import { openSettings } from '../dialogs/settings'
import { useIcons } from '../icons/context'
import { currentLocation } from '../location'
import { preferencesScope } from '../preferences-schema'

import { useSidebarItem } from './common'
import { LspSection, McpSection, QuickActionsSection, SkillsSection, SubagentSection, TodoSection } from './sections'
import { SelectionBox } from './selection-box'

import type { McpController } from '../controllers/mcp'
import type { PreferencesController } from '../controllers/preferences'
import type { SkillController } from '../controllers/skills'
import type { SubagentController } from '../controllers/subagents'
import type { TodoController } from '../controllers/todo'
import type { SidebarInteraction } from '../sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { BoxRenderable } from '@opentui/core'

export function SidebarTitle(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  interaction: SidebarInteraction
  sessionID: string
  title: string
}) {
  const icons = useIcons()
  const theme = () => props.api.theme.current
  const status = createMemo(() => props.api.state.session.status(props.sessionID)?.type)
  const settingsId = `${PLUGIN_ID}.settings`
  const settings = useSidebarItem(
    props.api,
    props.interaction,
    {
      id: settingsId,
      order: 0,
      activate: () => openSettings(props.api, props.preferences),
    },
    () => theme().textMuted,
    'control',
  )

  onCleanup(() => props.interaction.setTitleRoot(undefined))

  return (
    <box
      ref={(node: BoxRenderable) => props.interaction.setTitleRoot(node)}
      border={['bottom']}
      borderColor={theme().borderSubtle}
      paddingBottom={1}
      paddingRight={1}
    >
      <box flexDirection="row" justifyContent="space-between" gap={1}>
        <box flexDirection="row" gap={1} flexGrow={1}>
          <text flexShrink={0} fg={status() === 'busy' ? theme().primary : theme().accent}>
            {icons.icon(status() === 'busy' ? 'busy' : 'idle')}
          </text>
          <text fg={theme().text} wrapMode="word">
            <b>{props.title}</b>
          </text>
        </box>
        <SelectionBox
          iconOnly
          ref={(node: BoxRenderable) => settings.ref(node)}
          id={settingsId}
          flexShrink={0}
          alignSelf="flex-start"
          height={1}
          backgroundColor={settings.backgroundColor()}
          onMouseOver={settings.onMouseOver}
          onMouseOut={settings.onMouseOut}
          onMouseUp={(event) => settings.activate(event)}
        >
          <text fg={settings.foregroundColor()}>{icons.icon('settings')}</text>
        </SelectionBox>
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
        if (event.name !== 'escape' || event.defaultPrevented) return

        event.preventDefault()
        event.stopPropagation()
        props.interaction.leave()
      }}
    >
      <For each={props.preferences.sectionOrder()}>
        {(section, index) => {
          const order = () => (index() + 1) * 100

          return (
            <Show when={sections()[section]}>
              <Switch>
                <Match when={section === 'todo'}>
                  <TodoSection {...props} order={order()} controller={props.todo} />
                </Match>
                <Match when={section === 'subagents'}>
                  <SubagentSection {...props} order={order()} controller={props.subagents} />
                </Match>
                <Match when={section === 'skills'}>
                  <SkillsSection {...props} order={order()} controller={props.skills} />
                </Match>
                <Match when={section === 'quick_actions'}>
                  <QuickActionsSection {...props} order={order()} />
                </Match>
                <Match when={section === 'lsp'}>
                  <LspSection {...props} order={order()} />
                </Match>
                <Match when={section === 'mcp'}>
                  <McpSection {...props} order={order()} controller={props.mcp} />
                </Match>
              </Switch>
            </Show>
          )
        }}
      </For>
    </box>
  )
}

export function McpPersistence(props: { api: TuiPluginApi; controller: McpController }) {
  const persist = createMemo(() => props.controller.persist())

  createEffect(() => {
    if (!props.api.state.ready) return

    persist()
    const route = props.api.route.current
    const params = 'params' in route ? route.params : undefined

    if (typeof params?.sessionID !== 'string') return

    const current = props.controller.target()

    onCleanup(() => props.controller.deactivate(current))
    untrack(() => void props.controller.activate(current).catch(() => {}))
  })

  return <box />
}

export function PreferencesPersistence(props: { api: TuiPluginApi; controller: PreferencesController }) {
  createEffect(() => {
    const location = currentLocation(props.api)

    untrack(() =>
      props.controller.setActiveScope(
        preferencesScope({ directory: location.routing.directory, worktree: props.api.state.path.worktree }),
      ),
    )
    void props.controller.load()
  })

  return <box />
}

export function SidebarToggleBinding(props: { api: TuiPluginApi; preferences: PreferencesController }) {
  createEffect(() => {
    const key = props.preferences.toggleKey()
    const unregister = props.api.keymap.registerLayer({
      commands: [
        {
          name: TOGGLE_COMMAND,
          title: 'Toggle sidebar',
          category: 'Navigator',
          namespace: 'palette',
          enabled: () => props.api.route.current.name === 'session' && !props.api.ui?.dialog?.open,
          run() {
            props.api.keymap.dispatchCommand('session.sidebar.toggle')
          },
        },
        {
          name: `${LEGACY_PLUGIN_ID}.toggle`,
          run() {
            props.api.keymap.dispatchCommand(TOGGLE_COMMAND)
          },
        },
      ],
      bindings: [{ key, cmd: TOGGLE_COMMAND }],
    })

    onCleanup(unregister)
  })

  return <box />
}

export function SidebarFocusBinding(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  interaction: SidebarInteraction
}) {
  const commands = props.interaction.baseCommands()
  const unregisterCommands = props.api.keymap.registerLayer({
    commands: [
      ...commands,
      ...commands.map(({ name, run, enabled }) => ({
        name: name.replace(PLUGIN_ID, () => LEGACY_PLUGIN_ID),
        run,
        enabled,
      })),
    ],
  })

  onCleanup(unregisterCommands)

  createEffect(() => {
    const key = props.preferences.focusKey()
    const unregister = props.api.keymap.registerLayer({
      bindings: [{ key, cmd: FOCUS_COMMAND }],
    })

    onCleanup(unregister)
  })

  return <box />
}

export function FirstRunWizardPersistence(props: { api: TuiPluginApi; preferences: PreferencesController }) {
  let isChecked = false

  createEffect(() => {
    if (isChecked) return

    isChecked = true
    void showFirstRunWizard(props.api, props.preferences).catch(() => {})
  })

  return <box />
}
