/** @jsxImportSource @opentui/solid */
import { SearchBinding } from './components/search-binding'
import {
  FirstRunWizardPersistence,
  McpPersistence,
  PreferencesPersistence,
  SidebarContent,
  SidebarFocusBinding,
  SidebarTitle,
  SidebarToggleBinding,
} from './components/sidebar'
import { pluginConfig } from './config'
import { PLUGIN_ID } from './constants'
import { createMcpController } from './controllers/mcp'
import { createPreferencesController } from './controllers/preferences'
import { createSkillController } from './controllers/skills'
import { createSubagentController } from './controllers/subagents'
import { createTodoController } from './controllers/todo'
import { openKeyboardHelp } from './dialogs/keyboard-help'
import { IconProvider } from './icons/context'
import { createPreferencesStore } from './preferences-store'
import { createSidebarInteraction } from './sidebar-interaction'

import type { TuiPlugin, TuiPluginModule } from '@opencode-ai/plugin/tui'

export { Section, SectionFilter, matchesFilter } from './components/common'
export { LspBadge, McpSection, SkillsSection } from './components/sections'
export { SidebarToggleBinding } from './components/sidebar'
export { SidebarFocusBinding } from './components/sidebar'
export { DEFAULT_SECTION_EXPANSION, FOCUS_COMMAND, QUICK_ACTIONS } from './constants'
export { createMcpController } from './controllers/mcp'
export { createPreferencesController } from './controllers/preferences'
export { createSkillController } from './controllers/skills'
export { createSubagentController } from './controllers/subagents'
export { createTodoController } from './controllers/todo'
export { FirstRunWizard, openFirstRunWizard, showFirstRunWizard } from './dialogs/first-run'
export { SettingsDialog, openSettings } from './dialogs/settings'
export { KeyboardHelpDialog, openKeyboardHelp } from './dialogs/keyboard-help'
export { lspIcon } from './icons/lsp'
export { createSidebarInteraction, isEffectivelyVisible } from './sidebar-interaction'

const tui: TuiPlugin = async (api, options) => {
  const config = pluginConfig(options)
  const todo = createTodoController(api)
  const subagents = createSubagentController(api)
  const skills = createSkillController(api)
  const preferences = createPreferencesController(api, config, createPreferencesStore(api.state.path.state))
  const mcp = createMcpController(api, preferences.persistMcp, preferences)
  const interaction = createSidebarInteraction(api, () => openKeyboardHelp(api, preferences.lspIconStyle))

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
          <IconProvider style={preferences.lspIconStyle}>
            <PreferencesPersistence api={api} controller={preferences} />
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
          <IconProvider style={preferences.lspIconStyle}>
            <SidebarTitle
              api={api}
              preferences={preferences}
              interaction={interaction}
              sessionID={props.session_id}
              title={props.title}
            />
          </IconProvider>
        )
      },
      sidebar_content(_context, props) {
        return (
          <IconProvider style={preferences.lspIconStyle}>
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
}

const plugin: TuiPluginModule & { id: string } = {
  id: PLUGIN_ID,
  tui,
}

export default plugin
