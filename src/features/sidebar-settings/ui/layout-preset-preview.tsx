import { For, createMemo, onMount } from 'solid-js'

import { SECTION_DEFINITIONS } from '../../../entities/sidebar-layout'
import { useDialogs, useIcons } from '../../../shared/ui'
import { createLayoutPresetPreview, createMcpPresetPreview } from '../model/preset-preview'

import { mcpPreviewRows, reportMcpApplyError } from './mcp-preset-preview'
import { PresetPreviewFrame } from './preset-preview-frame'
import { PresetPreviewRow } from './preset-preview-row'

import type { McpController } from '../../../entities/mcp'
import type { PreferencesController } from '../../../entities/preferences'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function LayoutPresetPreview(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  controller?: McpController
  name: string
}) {
  const dialogs = useDialogs(props.api)
  const icons = useIcons()
  const model = createLayoutPresetPreview(props.preferences, props.name)
  const linked = props.preferences.workspaceProfiles?.()[props.name]
  const mcpModel =
    props.controller && linked ? createMcpPresetPreview(props.controller, props.preferences, linked) : undefined
  const rows = createMemo(
    () =>
      model
        .preview()
        ?.rows.map((row) => {
          const changes: string[] = []

          if (row.visibility[0] !== row.visibility[1])
            changes.push(`${row.visibility[0] ? 'visible' : 'hidden'} -> ${row.visibility[1] ? 'visible' : 'hidden'}`)

          if (row.expansion[0] !== row.expansion[1])
            changes.push(
              `${row.expansion[0] ? 'expanded' : 'collapsed'} -> ${row.expansion[1] ? 'expanded' : 'collapsed'}`,
            )

          if (row.position[0] !== row.position[1]) changes.push(`position ${row.position[0]} -> ${row.position[1]}`)

          return {
            icon: icons.section(row.section),
            title: `${row.position[1]}. ${SECTION_DEFINITIONS.find((section) => section.name === row.section)!.label}`,
            description: changes.join(' · ') || 'No changes',
            changed: changes.length > 0,
            status: changes.length > 0 ? ('changed' as const) : ('unchanged' as const),
            statusIcon: changes.length > 0 ? ('edit' as const) : ('done' as const),
            statusLabel: changes.length > 0 ? 'CHANGED' : 'UNCHANGED',
          }
        })
        .sort((a, b) => Number(b.changed) - Number(a.changed)) ?? [],
  )
  const mcpRows = createMemo(() => (mcpModel ? mcpPreviewRows(mcpModel, icons) : []))
  const changed = () => rows().filter((row) => row.changed).length

  onMount(() => mcpModel?.refresh())

  return (
    <PresetPreviewFrame
      api={props.api}
      title={`${mcpModel ? 'Workspace profile' : 'Layout preview'}: ${props.name}`}
      scope={mcpModel ? `${model.scope()} · MCP ${mcpModel.scope}` : model.scope()}
      stats={[
        { icon: 'edit', label: `${changed()} layout changed`, tone: 'accent' },
        { icon: 'done', label: `${rows().length - changed()} layout unchanged`, tone: 'muted' },
      ]}
      rowCount={rows().length + mcpRows().length}
      valid={() => model.valid() && (!mcpModel || mcpModel.valid())}
      blocked={model.blocked() || mcpModel?.blocked()}
      onRefresh={mcpModel?.refresh}
      notice={
        mcpModel
          ? 'Applies both presets; layout stays session-only.'
          : 'Applies layout changes. Save current layout as default to persist them.'
      }
      onApply={() => {
        const request = mcpModel?.apply()

        if (mcpModel && !request) return

        if (!model.apply()) return

        if (mcpModel) dialogs.close()
        else {
          dialogs.back()
          dialogs.back()
        }

        props.api.ui.toast({
          variant: 'success',
          title: mcpModel ? 'Workspace profile' : 'Layout presets',
          message: `${props.name} applied to ${model.scope()}`,
          duration: 3000,
        })

        if (request) reportMcpApplyError(props.api, request)
      }}
    >
      <For each={rows()}>{(row) => <PresetPreviewRow api={props.api} {...row} />}</For>
      <For each={mcpRows()}>{(row) => <PresetPreviewRow api={props.api} {...row} />}</For>
    </PresetPreviewFrame>
  )
}
