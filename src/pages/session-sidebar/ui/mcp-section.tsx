import { createMemo, createSignal } from 'solid-js'

import { openMcpPresets } from '../../../features/sidebar-settings'
import { PLUGIN_ID } from '../../../shared/config'
import { useIcons } from '../../../shared/ui'
import { createMcpSectionModel } from '../model/mcp-section-model'

import { McpSectionContent } from './mcp-section-content'
import { SectionWithHeaderAction } from './section'

import type { McpController } from '../../../entities/mcp'
import type { PreferencesController } from '../../../entities/preferences'
import type { SidebarInteraction } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function McpSection(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  controller: McpController
  preferences: PreferencesController
  navigationSection?: number
}) {
  const icons = useIcons()
  const [query, setQuery] = createSignal('')
  const model = createMcpSectionModel(props, query)
  const navigationSection = () => props.navigationSection ?? 6
  const summary = createMemo(
    () =>
      `${model.active()}/${model.list().length}${model.errors() ? ` · ${model.errors()} ${icons.icon('error')}` : ''}`,
  )

  return (
    <SectionWithHeaderAction
      api={props.api}
      interaction={props.interaction}
      sectionId={`${PLUGIN_ID}.section.mcp`}
      navigationSection={navigationSection()}
      title="MCP"
      section="mcp"
      summary={summary()}
      headerAction={{
        id: `${PLUGIN_ID}.mcp.presets`,
        label: () => `${icons.icon('presets')} ${model.presetName() ?? 'Preset'}`,
        disabled: () => model.bulkRunning() || model.mutationRunning() || props.preferences.ready?.() === false,
        onActivate: () => openMcpPresets(props.api, props.controller, props.preferences),
      }}
      open={props.preferences.expanded().mcp}
      onToggle={() => props.preferences.toggleSectionExpanded('mcp')}
    >
      <McpSectionContent
        api={props.api}
        interaction={props.interaction}
        controller={props.controller}
        preferences={props.preferences}
        navigationSection={navigationSection()}
        query={query()}
        onQuery={setQuery}
        model={model}
      />
    </SectionWithHeaderAction>
  )
}
