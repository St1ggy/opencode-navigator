/** @jsxImportSource @opentui/solid */
import { createMcpController } from '../entities/mcp'
import { createPreferencesController, createPreferencesStore } from '../entities/preferences'
import { createSkillController } from '../entities/skill'
import { createSubagentController } from '../entities/subagent'
import { createTodoController } from '../entities/todo'
import { openKeyboardHelp } from '../features/keyboard-help'
import { SearchBinding } from '../features/search-everything'
import { SettingsBinding, SettingsFooterButton } from '../features/sidebar-settings'
import {
  VersionFooter,
  VersionSummary,
  createVersionStatus,
  createVersionUpdateActions,
} from '../features/version-footer'
import {
  FirstRunWizardPersistence,
  McpPersistence,
  PreferencesPersistence,
  SidebarContent,
  SidebarFocusBinding,
  SidebarTitle,
  SidebarToggleBinding,
  createSidebarInteraction,
} from '../pages/session-sidebar'
import { PLUGIN_ID, pluginConfig } from '../shared/config'
import { IconProvider } from '../shared/ui'

import { loadConfiguredDefaults } from './configured-defaults'
import { createOpenCodeV2Api } from './opencode-v2'
import { createOpenCodeV1VersionUpdater, createOpenCodeV2VersionUpdater } from './version-updaters'

import type { Plugin as OpenCodeV2Plugin } from '@opencode/plugin/tui'
import type { TuiPlugin, TuiPluginMeta, TuiPluginModule } from '@opencode-ai/plugin/tui'

export {
  LspBadge,
  McpSection,
  Section,
  SectionFilter,
  SidebarFocusBinding,
  SidebarToggleBinding,
  SkillsSection,
  createSidebarInteraction,
  isEffectivelyVisible,
  matchesFilter,
} from '../pages/session-sidebar'
export { createMcpController } from '../entities/mcp'
export { createPreferencesController } from '../entities/preferences'
export { QUICK_ACTIONS } from '../entities/quick-action'
export { DEFAULT_SECTION_EXPANSION } from '../entities/sidebar-layout'
export { createSkillController } from '../entities/skill'
export { createSubagentController } from '../entities/subagent'
export { createTodoController } from '../entities/todo'
export { KeyboardHelpDialog, openKeyboardHelp } from '../features/keyboard-help'
export {
  FirstRunWizard,
  SettingsDialog,
  openFirstRunWizard,
  openSettings,
  showFirstRunWizard,
} from '../features/sidebar-settings'
export { FOCUS_COMMAND } from '../shared/config'
export { lspIcon } from '../shared/ui'

async function setupNavigator(
  api: Parameters<TuiPlugin>[0],
  options: Parameters<TuiPlugin>[1],
  readProject?: () => Promise<string | undefined>,
) {
  const config = pluginConfig(undefined)
  const configured = await loadConfiguredDefaults(api, options, readProject)
  const todo = createTodoController(api)
  const subagents = createSubagentController(api)
  const skills = createSkillController(api)
  const preferences = createPreferencesController(api, config, createPreferencesStore(api.state.path.state), configured)
  const mcp = createMcpController(api, preferences.persistMcp, preferences)
  const interaction = createSidebarInteraction(api, () =>
    openKeyboardHelp(api, preferences.lspIconStyle, preferences.cornerFont),
  )

  api.lifecycle.onDispose(() => preferences.flush())
  api.lifecycle.onDispose(() => interaction.dispose())

  const unsubscribeMcp = api.event.on('mcp.tools.changed', () => {
    void mcp.refresh().catch(() => {})
  })
  const unsubscribeConnected = api.event.on('server.connected', () => {
    if (!api.state.ready || !api.kv.ready) return

    void mcp.reconnect().catch(() => {})
  })

  api.lifecycle.onDispose(unsubscribeMcp)
  api.lifecycle.onDispose(unsubscribeConnected)

  api.slots.register({
    order: 100,
    slots: {
      app() {
        return (
          <IconProvider style={preferences.lspIconStyle} multilineCorners={preferences.cornerFont}>
            <PreferencesPersistence api={api} controller={preferences} />
            <SettingsBinding api={api} preferences={preferences} mcp={mcp} />
            <SidebarToggleBinding api={api} preferences={preferences} />
            <SidebarFocusBinding api={api} preferences={preferences} interaction={interaction} />
            <SearchBinding
              api={api}
              preferences={preferences}
              interaction={interaction}
              skills={skills}
              subagents={subagents}
              mcp={mcp}
            />
            <FirstRunWizardPersistence api={api} preferences={preferences} />
            <McpPersistence api={api} controller={mcp} />
          </IconProvider>
        )
      },
      sidebar_title(_context, props) {
        return (
          <IconProvider style={preferences.lspIconStyle} multilineCorners={preferences.cornerFont}>
            <SidebarTitle
              api={api}
              preferences={preferences}
              mcp={mcp}
              interaction={interaction}
              sessionID={props.session_id}
              title={props.title}
            />
          </IconProvider>
        )
      },
      sidebar_content(_context, props) {
        return (
          <IconProvider style={preferences.lspIconStyle} multilineCorners={preferences.cornerFont}>
            <SidebarContent
              api={api}
              mcp={mcp}
              todo={todo}
              subagents={subagents}
              skills={skills}
              preferences={preferences}
              interaction={interaction}
              sessionID={props.session_id}
            />
          </IconProvider>
        )
      },
    },
  })

  return { mcp, preferences }
}

export const setupOpenCodeV1: TuiPlugin = async (api, options, meta: TuiPluginMeta) => {
  const { preferences } = await setupNavigator(api, options, async () => {
    if (!api.client?.file?.read || !api.state.path.worktree) return

    const result = await api.client.file.read({ directory: api.state.path.worktree, path: '.opencode/navigator.json' })

    if (result.error) {
      if (result.response.status === 404) return

      throw result.error
    }

    return result.data?.type === 'text' ? result.data.content : undefined
  })
  const versionStatus = createVersionStatus(api, __NAVIGATOR_VERSION__)
  const versionUpdates = createVersionUpdateActions(api, versionStatus, createOpenCodeV1VersionUpdater(api, meta))

  api.slots.register({
    // OpenCode 1.x uses the lowest order as the single-winner footer.
    order: 90,
    slots: {
      sidebar_footer(_context, props) {
        return (
          <IconProvider style={preferences.lspIconStyle} multilineCorners={preferences.cornerFont}>
            <VersionFooter
              api={api}
              sessionID={props.session_id}
              navigatorVersion={__NAVIGATOR_VERSION__}
              status={versionStatus}
              onOpenCodeUpdate={versionUpdates.openCode}
              onNavigatorUpdate={versionUpdates.navigator}
            />
          </IconProvider>
        )
      },
    },
  })
}

export const setupOpenCodeV2: OpenCodeV2Plugin.Definition['setup'] = async (context) => {
  const adapter = createOpenCodeV2Api(context)
  const { mcp, preferences } = await setupNavigator(adapter.api, context.options as never, async () => {
    if (!context.client.file?.read) return

    return new TextDecoder().decode(
      await context.client.file.read({ location: context.location, path: '.opencode/navigator.json' }),
    )
  })
  const versionStatus = createVersionStatus(adapter.api, __NAVIGATOR_VERSION__)
  const versionUpdates = createVersionUpdateActions(adapter.api, versionStatus, createOpenCodeV2VersionUpdater(context))
  const disposeFooter = context.ui.slot({
    append: 'sidebar.footer',
    render: () => (
      <IconProvider style={preferences.lspIconStyle} multilineCorners={preferences.cornerFont}>
        <box flexDirection="row" justifyContent="space-between">
          <VersionSummary
            api={adapter.api}
            navigatorVersion={__NAVIGATOR_VERSION__}
            status={versionStatus}
            onOpenCodeUpdate={versionUpdates.openCode}
            onNavigatorUpdate={versionUpdates.navigator}
          />
          <SettingsFooterButton api={adapter.api} preferences={preferences} mcp={mcp} />
        </box>
      </IconProvider>
    ),
  })

  return async () => {
    disposeFooter()
    await adapter.dispose()
  }
}

const plugin: TuiPluginModule & OpenCodeV2Plugin.Definition & { id: string } = {
  id: PLUGIN_ID,
  tui: setupOpenCodeV1,
  setup: setupOpenCodeV2,
}

export default plugin
