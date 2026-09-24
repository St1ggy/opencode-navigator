import { For, createMemo, onMount } from 'solid-js'

import { useDialogs, useIcons } from '../../../shared/ui'
import { createMcpPresetPreview } from '../model/preset-preview'

import { PresetPreviewFrame } from './preset-preview-frame'
import { PresetPreviewRow } from './preset-preview-row'

import type { McpController } from '../../../entities/mcp'
import type { PreferencesController } from '../../../entities/preferences'
import type { useIcons as createIcons } from '../../../shared/ui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function McpPresetPreview(props: {
  api: TuiPluginApi
  controller: McpController
  preferences: PreferencesController
  name: string
}) {
  const dialogs = useDialogs(props.api)
  const icons = useIcons()
  const model = createMcpPresetPreview(props.controller, props.preferences, props.name)

  onMount(model.refresh)
  const rows = createMemo(() => mcpPreviewRows(model, icons))
  const count = (change: string) => model.preview().rows.filter((row) => row.change === change).length

  return (
    <PresetPreviewFrame
      api={props.api}
      title={`MCP preview: ${props.name}`}
      scope={model.scope}
      stats={[
        { icon: 'connected', label: `${count('connect')} connect`, tone: 'accent' },
        { icon: 'disconnected', label: `${count('disconnect')} disconnect`, tone: 'accent' },
        { icon: 'pending', label: `${count('missing') + count('unavailable')} skipped`, tone: 'warning' },
        { icon: 'done', label: `${count('unchanged')} unchanged`, tone: 'muted' },
      ]}
      rowCount={rows().length}
      valid={model.valid}
      blocked={model.blocked()}
      onRefresh={model.refresh}
      notice={
        props.controller.persist()
          ? 'Desired states will be remembered for this scope, including unavailable servers.'
          : 'MCP state persistence is off; desired states will not be saved.'
      }
      onApply={() => {
        const request = model.apply()

        if (!request) return

        dialogs.close()
        reportMcpApplyError(props.api, request)
      }}
    >
      <For each={rows()}>{(row) => <PresetPreviewRow api={props.api} {...row} />}</For>
    </PresetPreviewFrame>
  )
}

export function reportMcpApplyError(api: TuiPluginApi, request: Promise<void>) {
  void request.catch((error) =>
    api.ui.toast({
      variant: 'error',
      title: 'Preset apply',
      message: error instanceof Error ? error.message : 'MCP preset failed',
      duration: 4000,
    }),
  )
}

export function mcpPreviewRows(
  model: ReturnType<typeof createMcpPresetPreview>,
  icons: ReturnType<typeof createIcons>,
) {
  return model
    .preview()
    .rows.map((row) => {
      const unchanged = `${row.status ?? 'not available'} · unchanged`
      const description = row.desired
        ? {
            missing: `Not available in this workspace · target ${row.desired} · skipped`,
            unavailable: `${row.status} · target ${row.desired} · skipped`,
            connect: `${row.status} -> enabled · connect`,
            disconnect: `${row.status} -> disabled · disconnect`,
            unchanged,
          }[row.change]
        : `${unchanged} (not in preset)`

      return {
        icon: icons.icon('mcp'),
        title: row.name,
        description,
        changed: row.change === 'connect' || row.change === 'disconnect',
        skipped: row.change === 'missing' || row.change === 'unavailable',
        status:
          row.change === 'connect' || row.change === 'disconnect'
            ? ('changed' as const)
            : row.change === 'missing' || row.change === 'unavailable'
              ? ('skipped' as const)
              : ('unchanged' as const),
        statusIcon:
          row.change === 'connect'
            ? ('connected' as const)
            : row.change === 'disconnect'
              ? ('disconnected' as const)
              : row.change === 'missing' || row.change === 'unavailable'
                ? ('pending' as const)
                : ('done' as const),
        statusLabel:
          row.change === 'connect'
            ? 'CONNECT'
            : row.change === 'disconnect'
              ? 'DISCONNECT'
              : row.change === 'missing' || row.change === 'unavailable'
                ? 'SKIPPED'
                : 'UNCHANGED',
      }
    })
    .sort((a, b) => Number(b.changed) - Number(a.changed) || Number(b.skipped) - Number(a.skipped))
}
