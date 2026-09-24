import { type PluginConfig, pluginConfig } from '../../../shared/config'

import {
  type LayoutPresets,
  type McpPresets,
  type McpServerGroups,
  type PreferenceValues,
  type WorkspaceProfiles,
  parseDesiredMcpStates,
  parseLayoutPresets,
  parseMcpPresets,
  parseMcpServerGroups,
  parsePluginSettings,
  parseSectionLayout,
  parseWorkspaceProfiles,
} from './schema'

export type ConfiguredDefaults = PreferenceValues & {
  layoutPresets?: LayoutPresets
  mcpPresets?: McpPresets
  workspaceProfiles?: WorkspaceProfiles
  mcpServerGroups?: McpServerGroups
}

function record(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return

  return value as Record<string, unknown>
}

function present(value: object | undefined) {
  return value && Object.keys(value).length > 0
}

export function parseConfiguredDefaults(value: unknown): ConfiguredDefaults {
  const input = record(value)

  if (!input) throw new Error('Expected a JSON object')

  const behavior = parsePluginSettings(input.behavior)
  const layout = parseSectionLayout(input.layout)
  const desiredMcpStates = parseDesiredMcpStates(input.mcp ?? input.desiredMcpStates)
  const layoutPresets = parseLayoutPresets(input.layoutPresets)
  const mcpPresets = parseMcpPresets(input.mcpPresets)
  const workspaceProfiles = parseWorkspaceProfiles(input.workspaceProfiles)
  const mcpServerGroups = parseMcpServerGroups(input.mcpServerGroups)

  return {
    ...(present(behavior) && { behavior }),
    ...(layout && { layout }),
    ...(present(desiredMcpStates) && { desiredMcpStates }),
    ...(present(layoutPresets) && { layoutPresets }),
    ...(present(mcpPresets) && { mcpPresets }),
    ...(present(workspaceProfiles) && { workspaceProfiles }),
    ...(present(mcpServerGroups) && { mcpServerGroups }),
  }
}

function mergeRecords(left: Record<string, unknown>, right: Record<string, unknown>) {
  const result = { ...left }

  for (const [key, value] of Object.entries(right)) {
    const previous = record(result[key])
    const next = record(value)

    result[key] = previous && next ? mergeRecords(previous, next) : value
  }

  return result
}

export function mergeConfiguredDefaults(...layers: (ConfiguredDefaults | undefined)[]): ConfiguredDefaults {
  let merged: Record<string, unknown> = {}

  for (const layer of layers) {
    if (layer) merged = mergeRecords(merged, layer as Record<string, unknown>)
  }

  return parseConfiguredDefaults(merged)
}

function legacyDefaults(config: PluginConfig): ConfiguredDefaults {
  const { sections, sectionOrder, ...behavior } = config

  return { behavior, layout: { sections, expanded: {}, ...(sectionOrder && { order: sectionOrder }) } }
}

export function configuredDefaultsFromPluginOptions(options: Record<string, unknown> | undefined) {
  return mergeConfiguredDefaults(legacyDefaults(pluginConfig(options)), parseConfiguredDefaults(options ?? {}))
}
