import {
  type DesiredMcpStates,
  type ResolvedPreferences,
  type SectionLayoutDefault,
  parseSectionLayout,
} from './preferences-schema'
import { mcpToggleAction } from './state'

export function layoutPresetPreview(current: ResolvedPreferences['layout'], preset: SectionLayoutDefault) {
  const parsed = parseSectionLayout(preset)

  if (!parsed) throw new Error('Invalid layout preset')

  const next = {
    sections: { ...current.sections, ...parsed.sections },
    expanded: { ...current.expanded, ...parsed.expanded },
    order: parsed.order ?? [...current.order],
  }
  const rows = next.order.map((section, index) => ({
    section,
    visibility: [current.sections[section], next.sections[section]] as const,
    expansion: [current.expanded[section], next.expanded[section]] as const,
    position: [current.order.indexOf(section) + 1, index + 1] as const,
  }))

  return { next, rows }
}

export function mcpPresetPreview(items: readonly { name: string; status: string }[], states: DesiredMcpStates) {
  const byName = new Map(items.map((item) => [item.name, item]))
  const names = [...new Set([...Object.keys(states), ...byName.keys()])].sort((a, b) => a.localeCompare(b))
  const rows = names.map((name) => {
    const item = byName.get(name)
    const desired = Object.hasOwn(states, name) ? states[name] : undefined
    const action = item && mcpToggleAction(item.status)
    let change: 'connect' | 'disconnect' | 'unchanged' | 'missing' | 'unavailable' = 'unchanged'

    if (desired && !item) change = 'missing'
    else if (desired && !action) change = 'unavailable'
    else if ((desired === 'enabled' && action === 'connect') || (desired === 'disabled' && action === 'disconnect')) {
      change = action
    }

    return { name, status: item?.status, desired, change }
  })
  const changes = rows.flatMap((row) =>
    row.change === 'connect' || row.change === 'disconnect' ? [{ name: row.name, action: row.change }] : [],
  )

  return { rows, changes }
}
