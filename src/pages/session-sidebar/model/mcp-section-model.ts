import { createMemo } from 'solid-js'

import { buildMcpGroupedView, matchingMcpPreset, mcpToggleAction } from '../../../entities/mcp'
import { createListVisibility } from '../../../shared/lib/list-visibility'
import { matchesFilter } from '../lib/matches-filter'

import type { McpController } from '../../../entities/mcp'
import type { PreferencesController } from '../../../entities/preferences'
import type { Accessor } from 'solid-js'

export function createMcpSectionModel(
  props: { controller: McpController; preferences: PreferencesController },
  query: Accessor<string>,
) {
  const target = createMemo(() => props.controller.target())
  const favorites = createMemo(() => props.preferences.favoriteMcpServers?.() ?? new Set<string>())
  const groups = createMemo(() => props.preferences.mcpServerGroups?.() ?? {})
  const grouped = createMemo(() => Object.keys(groups()).length > 0)
  const list = createMemo(() => buildMcpGroupedView(props.controller.list(target()), favorites(), groups()))
  const filtered = createMemo(() =>
    list().filter((item) => matchesFilter(query(), `${item.name} ${item.assignedGroup ?? ''}`)),
  )
  const visibility = createListVisibility({
    items: filtered,
    limit: () => props.preferences.sectionItemLimit?.('mcp') ?? 0,
    resetKey: () => JSON.stringify([target().key, query()]),
  })
  const active = createMemo(() => list().filter((item) => item.status === 'connected').length)
  const state = createMemo(() => props.controller.state(target()))
  const bulk = createMemo(
    () =>
      props.controller.bulkState?.(target()) ?? {
        action: 'connect' as const,
        status: 'idle' as const,
        completed: 0,
        total: 0,
        failed: [],
      },
  )
  const bulkRunning = createMemo(() => bulk().status === 'running')
  const mutationRunning = createMemo(() => props.controller.mutating?.(target()))
  const connectable = createMemo(() => list().filter((item) => mcpToggleAction(item.status) === 'connect').length)
  const disconnectable = createMemo(() => list().filter((item) => mcpToggleAction(item.status) === 'disconnect').length)
  const errors = createMemo(
    () =>
      list().filter(
        (item) =>
          item.status === 'failed' || item.status === 'needs_auth' || item.status === 'needs_client_registration',
      ).length,
  )
  const presetName = createMemo(() => {
    const presets = props.preferences.mcpPresets?.() ?? {}
    const selected = props.controller.selectedPreset?.(target())

    return selected && Object.hasOwn(presets, selected) ? selected : matchingMcpPreset(list(), presets)
  })

  return {
    target,
    favorites,
    groups,
    grouped,
    list,
    filtered,
    visibility,
    active,
    state,
    bulk,
    bulkRunning,
    mutationRunning,
    connectable,
    disconnectable,
    errors,
    presetName,
  }
}
