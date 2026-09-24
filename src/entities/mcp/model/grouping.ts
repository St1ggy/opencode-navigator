import type { McpServerGroups } from '../../../shared/config'
import type { TuiSidebarMcpItem } from '@opencode-ai/plugin/tui'

export type GroupedMcpItem = TuiSidebarMcpItem & { bucket: string; assignedGroup?: string }
const BUCKET_RANK: Record<string, number> = { Favorites: 0, Ungrouped: 2 }

export function buildMcpGroupedView(
  items: readonly TuiSidebarMcpItem[],
  favorites: ReadonlySet<string>,
  assignments: McpServerGroups,
): GroupedMcpItem[] {
  return items
    .map((item) => ({
      ...item,
      assignedGroup: assignments[item.name],
      bucket: favorites.has(item.name) ? 'Favorites' : (assignments[item.name] ?? 'Ungrouped'),
    }))
    .sort((left, right) => {
      const leftRank = BUCKET_RANK[left.bucket] ?? 1
      const rightRank = BUCKET_RANK[right.bucket] ?? 1

      return leftRank - rightRank || left.bucket.localeCompare(right.bucket) || left.name.localeCompare(right.name)
    })
}
