import { normalizePresetName } from './preset-name'

import type { DesiredMcpState, LayoutPresets, McpPresets, SectionLayoutDefault } from './schema'
import type { PreferencesUpdate } from './updates'

type UserUpdate = NonNullable<PreferencesUpdate['user']>

export function createPreferencePresetActions(input: {
  load(): Promise<void>
  requireHydration(): void
  layoutPresets(): LayoutPresets
  mcpPresets(): McpPresets
  currentLayoutPreset(): SectionLayoutDefault
  persistLayoutPresets(next: LayoutPresets, update: UserUpdate['layoutPreset']): void
  persistMcpPresets(next: McpPresets, update: NonNullable<UserUpdate['mcpPreset']>): void
}) {
  return {
    saveLayoutPreset(value: string) {
      void input.load()
      const name = normalizePresetName(value)

      if (
        Object.keys(input.layoutPresets()).some(
          (candidate) => candidate.toLocaleLowerCase() === name.toLocaleLowerCase(),
        )
      )
        throw new Error('A preset with this name already exists')

      if (Object.keys(input.layoutPresets()).length >= 50) throw new Error('You can save at most 50 layout presets')

      const layout = input.currentLayoutPreset()

      input.persistLayoutPresets({ ...input.layoutPresets(), [name]: layout }, { name, layout })

      return name
    },
    updateLayoutPreset(name: string) {
      if (!input.layoutPresets()[name]) return false

      const layout = input.currentLayoutPreset()

      input.persistLayoutPresets({ ...input.layoutPresets(), [name]: layout }, { name, layout })

      return true
    },
    renameLayoutPreset(current: string, value: string) {
      const name = normalizePresetName(value)
      const preset = input.layoutPresets()[current]

      if (!preset) throw new Error('Layout preset no longer exists')

      if (
        name.toLocaleLowerCase() !== current.toLocaleLowerCase() &&
        Object.keys(input.layoutPresets()).some(
          (candidate) => candidate.toLocaleLowerCase() === name.toLocaleLowerCase(),
        )
      )
        throw new Error('A preset with this name already exists')

      const next = { ...input.layoutPresets() }

      delete next[current]
      next[name] = preset
      input.persistLayoutPresets(next, { name, layout: preset, previousName: current })

      return name
    },
    deleteLayoutPreset(name: string) {
      if (!input.layoutPresets()[name]) return false

      const next = { ...input.layoutPresets() }

      delete next[name]
      input.persistLayoutPresets(next, { name })

      return true
    },
    saveMcpPreset(value: string, states: Record<string, DesiredMcpState>) {
      input.requireHydration()

      if (Object.keys(states).length === 0) throw new Error('There are no MCP servers to save')

      const name = normalizePresetName(value)

      if (
        Object.keys(input.mcpPresets()).some((candidate) => candidate.toLocaleLowerCase() === name.toLocaleLowerCase())
      )
        throw new Error('A preset with this name already exists')

      if (Object.keys(input.mcpPresets()).length >= 50) throw new Error('You can save at most 50 MCP presets')

      const preset = { ...states }

      input.persistMcpPresets({ ...input.mcpPresets(), [name]: preset }, { operation: 'save', name, states: preset })

      return name
    },
    updateMcpPreset(name: string, states: Record<string, DesiredMcpState>) {
      input.requireHydration()

      if (!input.mcpPresets()[name]) return false

      if (Object.keys(states).length === 0) throw new Error('There are no MCP servers to save')

      const preset = { ...states }

      input.persistMcpPresets({ ...input.mcpPresets(), [name]: preset }, { operation: 'update', name, states: preset })

      return true
    },
    renameMcpPreset(current: string, value: string) {
      input.requireHydration()
      const name = normalizePresetName(value)
      const preset = input.mcpPresets()[current]

      if (!preset) throw new Error('MCP preset no longer exists')

      if (
        name.toLocaleLowerCase() !== current.toLocaleLowerCase() &&
        Object.keys(input.mcpPresets()).some((candidate) => candidate.toLocaleLowerCase() === name.toLocaleLowerCase())
      )
        throw new Error('A preset with this name already exists')

      const next = { ...input.mcpPresets() }

      delete next[current]
      next[name] = preset
      input.persistMcpPresets(next, { operation: 'rename', name, previousName: current })

      return name
    },
    deleteMcpPreset(name: string) {
      input.requireHydration()

      if (!input.mcpPresets()[name]) return false

      const next = { ...input.mcpPresets() }

      delete next[name]
      input.persistMcpPresets(next, { operation: 'delete', name })

      return true
    },
  }
}
