import { For, createMemo } from 'solid-js'

import { PresetPreviewRow } from '../components/preset-preview-row'
import { SECTION_DEFINITIONS } from '../constants'
import { createLayoutPresetPreview } from '../controllers/preset-preview'
import { useIcons } from '../icons/context'

import { useDialogs } from './context'
import { PresetPreviewFrame } from './preset-preview-frame'

import type { PreferencesController } from '../controllers/preferences'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function LayoutPresetPreview(props: { api: TuiPluginApi; preferences: PreferencesController; name: string }) {
  const dialogs = useDialogs(props.api)
  const icons = useIcons()
  const model = createLayoutPresetPreview(props.preferences, props.name)
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

  return (
    <PresetPreviewFrame
      api={props.api}
      title={`Layout preview: ${props.name}`}
      scope={model.scope()}
      stats={[
        { icon: 'edit', label: `${rows().filter((row) => row.changed).length} changed`, tone: 'accent' },
        { icon: 'done', label: `${rows().filter((row) => !row.changed).length} unchanged`, tone: 'muted' },
      ]}
      rowCount={rows().length}
      valid={model.valid}
      blocked={model.blocked()}
      notice="Applies visibility, expansion and order. Use Save current layout as default to persist the layout."
      onApply={() => {
        if (!model.apply()) return

        dialogs.back()
        dialogs.back()
        props.api.ui.toast({
          variant: 'success',
          title: 'Layout presets',
          message: `${props.name} applied to ${model.scope()}`,
          duration: 3000,
        })
      }}
    >
      <For each={rows()}>{(row) => <PresetPreviewRow api={props.api} {...row} />}</For>
    </PresetPreviewFrame>
  )
}
