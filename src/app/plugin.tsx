/** @jsxImportSource @opentui/solid */
import { createMcpController } from '../entities/mcp'
import { createPreferencesController, createPreferencesStore } from '../entities/preferences'
import { createSkillController } from '../entities/skill'
import { createSubagentController } from '../entities/subagent'
import { type NavigatorTodoController, createNavigatorTodoController, createTodoController } from '../entities/todo'
import { openKeyboardHelp } from '../features/keyboard-help'
import { SearchBinding } from '../features/search-everything'
import { PermissionModeBinding, SettingsBinding, SettingsFooterButton } from '../features/sidebar-settings'
import { StartupSessionBinding, createStartupSessionController } from '../features/startup-session'
import { UpgradeNotesBinding } from '../features/upgrade-notes'
import { VersionFooter, VersionSummary } from '../features/version-footer'
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
import { supportsPermissionMode } from '../shared/lib/host-capabilities'
import { IconProvider } from '../shared/ui'

import { loadConfiguredDefaults } from './configured-defaults'
import { LimitsPersistence } from './limits-persistence'
import { createOpenCodeV2Api } from './opencode-v2'

import type { createProviderQuotaIntegration as CreateQuotaIntegration } from './provider-quota'
import type * as NavigatorUpdates from '../navigator-updates'
import type { ProviderLimitsSection as LimitsComponent } from '../pages/session-sidebar'
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

function loadNavigatorUpdates(): Promise<typeof NavigatorUpdates> {
  const path = import.meta.url.includes('/dist/tui.js') ? './navigator-updates.js' : '../navigator-updates'

  return import(path)
}

async function setupNavigator(
  api: Parameters<TuiPlugin>[0],
  options: Parameters<TuiPlugin>[1],
  readProject?: () => Promise<string | undefined>,
  managedTodo?: NavigatorTodoController,
  hostContext?: OpenCodeV2Plugin.Context,
) {
  const config = pluginConfig(undefined)
  const configured = await loadConfiguredDefaults(api, options, readProject)
  const todo = managedTodo ?? createTodoController(api)
  const subagents = createSubagentController(api)
  const skills = createSkillController(api)
  const preferences = createPreferencesController(api, config, createPreferencesStore(api.state.path.state), configured)
  const limitsPath = import.meta.url.includes('/dist/tui.js') ? './provider-limits.js' : '../provider-limits'
  const limitsModule = (await import(limitsPath)) as {
    ProviderLimitsSection: typeof LimitsComponent
    createProviderQuotaIntegration: typeof CreateQuotaIntegration
  }
  const LimitsSection = limitsModule.ProviderLimitsSection
  const {
    controller: limits,
    codex,
    accountSource,
    selectModel,
    modelSelection,
  } = limitsModule.createProviderQuotaIntegration(api, preferences, __NAVIGATOR_VERSION__, hostContext)
  const mcp = createMcpController(api, preferences.persistMcp, preferences)
  const interaction = createSidebarInteraction(api, () =>
    openKeyboardHelp(api, preferences.lspIconStyle, preferences.cornerFont),
  )
  const startup = createStartupSessionController(api, preferences)

  api.lifecycle.onDispose(() => preferences.flush())
  api.lifecycle.onDispose(() => limits.dispose())
  api.lifecycle.onDispose(() => accountSource?.dispose())
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
            <LimitsPersistence
              controller={limits}
              accountSource={accountSource}
              selectedModel={selectModel}
              refreshMinutes={preferences.limitsRefreshMinutes}
            />
            {supportsPermissionMode(api) && <PermissionModeBinding api={api} preferences={preferences} />}
            <SettingsBinding api={api} preferences={preferences} mcp={mcp} skills={skills} />
            <SidebarToggleBinding api={api} preferences={preferences} />
            <SidebarFocusBinding api={api} preferences={preferences} interaction={interaction} />
            <SearchBinding
              api={api}
              preferences={preferences}
              onNewSession={startup.handleNewSession}
              interaction={interaction}
              skills={skills}
              subagents={subagents}
              mcp={mcp}
            />
            <FirstRunWizardPersistence api={api} preferences={preferences} />
            <StartupSessionBinding api={api} controller={startup} />
            <UpgradeNotesBinding api={api} preferences={preferences} version={__NAVIGATOR_VERSION__} />
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
              skills={skills}
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
              onNewSession={startup.handleNewSession}
              mcp={mcp}
              limitsSection={(navigationSection) => (
                <LimitsSection
                  api={api}
                  preferences={preferences}
                  interaction={interaction}
                  controller={limits}
                  codex={codex}
                  modelSelection={modelSelection}
                  navigationSection={navigationSection}
                />
              )}
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

  return { mcp, skills, preferences }
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
  const { createVersionStatus, createVersionUpdateActions, createOpenCodeV1VersionUpdater } =
    await loadNavigatorUpdates()
  const versionStatus = createVersionStatus(api, __NAVIGATOR_VERSION__)
  const versionUpdates = createVersionUpdateActions(api, versionStatus, createOpenCodeV1VersionUpdater(api, meta), () =>
    preferences.rememberNavigatorVersionBeforeUpdate(__NAVIGATOR_VERSION__),
  )

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
  const todo = createNavigatorTodoController(context, adapter.api)
  const { mcp, skills, preferences } = await setupNavigator(
    adapter.api,
    context.options as never,
    async () => {
      if (!context.client.file?.read) return

      return new TextDecoder().decode(
        await context.client.file.read({ location: context.location, path: '.opencode/navigator.json' }),
      )
    },
    todo,
    context,
  )
  const { createVersionStatus, createVersionUpdateActions, createOpenCodeV2VersionUpdater } =
    await loadNavigatorUpdates()
  const versionStatus = createVersionStatus(adapter.api, __NAVIGATOR_VERSION__)
  const versionUpdates = createVersionUpdateActions(
    adapter.api,
    versionStatus,
    createOpenCodeV2VersionUpdater(context),
    () => preferences.rememberNavigatorVersionBeforeUpdate(__NAVIGATOR_VERSION__),
  )
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
          <SettingsFooterButton api={adapter.api} preferences={preferences} mcp={mcp} skills={skills} />
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
