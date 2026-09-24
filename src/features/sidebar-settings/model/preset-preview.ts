import { createMemo } from 'solid-js'

import { mcpPresetPreview } from '../../../shared/lib/preset-preview'

import type { McpController } from '../../../entities/mcp'
import type { DesiredMcpStates, PreferencesController, SectionLayoutDefault } from '../../../entities/preferences'

export function createLayoutPresetPreview(preferences: PreferencesController, name: string) {
  const scope = preferences.selectedScopeKey()
  const valid = () => preferences.selectedScopeKey() === scope
  const preset = createMemo<SectionLayoutDefault | undefined>(() => preferences.layoutPresets()[name])
  const preview = createMemo(() => {
    const value = preset()

    return value ? preferences.previewLayoutPreset(value) : undefined
  })

  return {
    valid,
    preview,
    scope: preferences.preferenceScopeLabel,
    blocked: () => (preset() ? '' : 'Preset no longer exists.'),
    apply() {
      const value = preset()

      if (!valid() || !value) return false

      preferences.applyLayoutPreset(value)

      return true
    },
  }
}

export function createMcpPresetPreview(controller: McpController, preferences: PreferencesController, name: string) {
  const target = controller.target()
  const valid = () => {
    const current = controller.target()

    return current.key === target.key && current.scope === target.scope
  }
  const preset = createMemo<DesiredMcpStates | undefined>(() => preferences.mcpPresets()[name])
  const preview = createMemo(() => mcpPresetPreview(controller.list(target), preset() ?? {}))
  const state = createMemo(() => controller.state(target))
  const blocked = createMemo(() => {
    if (!preset()) return 'Preset no longer exists.'

    if (controller.mutating(target)) return 'Wait for the current MCP operation to finish.'

    if (state().error) return `Could not refresh MCP: ${state().error!.message}. Retry to update the preview.`

    return state().status === 'ready' ? '' : 'Refreshing MCP states…'
  })

  return {
    valid,
    preview,
    blocked,
    scope: target.scope,
    refresh() {
      if (valid() && !controller.mutating(target)) void controller.refresh(target, true).catch(() => {})
    },
    apply() {
      const value = preset()

      return value && valid() && !blocked() ? controller.applyPreset(name, value, target) : undefined
    },
  }
}
