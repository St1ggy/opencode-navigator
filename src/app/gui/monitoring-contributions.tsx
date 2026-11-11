import { Command, Panel, Slot } from '@opencode/plugin/gui'
import { Show } from 'solid-js'

import { MonitoringContent, MonitoringPanel, NavigatorMiniWindow } from '../../pages/navigator/gui'

import { createGuiAbout } from './about'
import { createGuiLimitsDialogs } from './limits-dialogs'
import { createGuiMcpDialogs } from './mcp-dialogs'
import { createMonitoringPresentation } from './monitoring-presentation'
import { createMonitoringRegistry } from './monitoring-registry'
import { createGuiNotifications } from './notifications'
import { createGuiPresetDialogs } from './preset-dialogs'
import { createGuiSearchDialog } from './search-dialog'
import { registerGuiSettings } from './settings'
import { createGuiSettingsActions } from './settings-actions'
import { createGuiSkillDialogs } from './skill-dialogs'
import { createTodoDialogs } from './todo-dialogs'
import { createGuiToolbarDialogs } from './toolbar-dialogs'
import { createGuiToolbarModel } from './toolbar-model'

import type { PreferencesController } from '../../entities/preferences/model'
import type { Context, PanelTab } from '@opencode/plugin/gui'

export function registerMonitoring(context: Context, preferences: PreferencesController) {
  const registry = createMonitoringRegistry(context, preferences)
  const dialogs = createTodoDialogs(context, registry.active)
  const skills = createGuiSkillDialogs(context, registry.active, preferences)
  const search = createGuiSearchDialog(context, registry, preferences, skills)
  const mcp = createGuiMcpDialogs(context, registry.active, preferences)
  const notifications = createGuiNotifications(context)
  const pins = createGuiToolbarDialogs(context, registry, preferences)
  const toolbar = createGuiToolbarModel(context, registry, preferences, skills)
  const limits = createGuiLimitsDialogs(context, registry, preferences)
  const presentation = createMonitoringPresentation(context, registry)
  const { dock, float, title, scrollTop, scroll } = presentation

  const settings = registerGuiSettings(context, {
    ...createGuiSettingsActions(context, preferences, registry),
    hostSettings: () => context.layout.settings('general'),
    about: createGuiAbout(context),
    presets: createGuiPresetDialogs(context, preferences, registry, mcp.presets),
    ui: context.ui,
    preferences,
    presentation: () => (presentation.state.floating ? 'floating' : 'panel'),
    setPresentation: (value) => (value === 'floating' ? float() : dock()),
    resetWindow: presentation.reset,
    configureToolbar: pins.manage,
  })
  const services = {
    ui: context.ui,
    onEnableTodo: dialogs.enable,
    onArchive: dialogs.archive,
    onSkill: skills.open,
    onMcpInformation: mcp.information,
    onMcpPresets: mcp.presets,
    notifications,
    toolbar,
    onPin: pins.open,
    onConfigurePin: pins.configure,
    onManageToolbar: pins.manage,
    onLinkAccount: limits.linkAccount,
    onBankedResets: limits.resets,
    onSettings: settings,
  }
  const tab = { id: 'navigator', title: 'Navigator', closable: 'hover' } satisfies PanelTab

  context.add(Command, () => ({
    id: 'toolbar',
    title: 'Configure Navigator toolbar',
    enabled: preferences.ready(),
    run: pins.manage,
  }))
  context.add(Command, () => ({
    id: 'search',
    title: 'Search Everything in Navigator',
    enabled: Boolean(registry.active()),
    run: search.open,
  }))
  context.add(Command, () => ({
    id: 'open',
    title: 'Open Navigator',
    enabled: Boolean(context.sessions.current()),
    run: presentation.open,
  }))
  context.add(Command, () => ({
    id: 'float',
    title: 'Float Navigator',
    enabled: Boolean(context.sessions.current()),
    run: float,
  }))
  context.add(Panel, {
    id: 'navigator',
    region: 'side',
    width: 340,
    mobile: { title: 'Navigator', order: 50, kind: 'drawer', icon: 'bullet-list' },
    list: (input) => (input.open.includes('navigator') ? [tab] : []),
    render: () => (
      <MonitoringPanel
        {...services}
        runtime={registry.active()}
        title={title()}
        floating={presentation.state.floating}
        float={float}
        dock={dock}
        search={search.open}
        scrollTop={scrollTop()}
        onScroll={scroll}
      />
    ),
  })
  context.add(Slot, {
    at: 'window.bottom',
    render: () => (
      <Show
        when={
          presentation.state.floating && context.sessions.current() && !context.layout.narrow()
            ? registry.active()
            : undefined
        }
      >
        {(runtime) => (
          <NavigatorMiniWindow
            ui={context.ui}
            title={`Navigator · ${title()}`}
            rect={presentation.state.rect}
            mode={context.appearance.mode()}
            modal={context.dialogs.active()}
            setRect={presentation.setRect}
            redock={dock}
            refresh={() => void runtime().refresh(true)}
            search={search.open}
          >
            <MonitoringContent {...services} runtime={runtime()} scrollTop={scrollTop()} onScroll={scroll} />
          </NavigatorMiniWindow>
        )}
      </Show>
    ),
  })
}
