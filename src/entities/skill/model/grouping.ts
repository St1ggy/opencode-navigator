import type { SkillInfo } from './controller'
import type { SkillGroups } from '../../../shared/config'

export type GroupedSkill = SkillInfo & { bucket: string; assignedGroup?: string }
const BUCKET_RANK: Record<string, number> = { Favorites: 0, Ungrouped: 2 }

export function buildSkillGroupedView(
  items: readonly SkillInfo[],
  favorites: ReadonlySet<string>,
  groups: SkillGroups,
  recent: ReadonlyMap<string, number>,
): GroupedSkill[] {
  return items
    .map((item) => ({
      ...item,
      assignedGroup: groups[item.location],
      bucket: favorites.has(item.location) ? 'Favorites' : (groups[item.location] ?? 'Ungrouped'),
    }))
    .sort((left, right) => {
      const rank = (BUCKET_RANK[left.bucket] ?? 1) - (BUCKET_RANK[right.bucket] ?? 1)

      return (
        rank ||
        left.bucket.localeCompare(right.bucket) ||
        (left.bucket === 'Favorites'
          ? 0
          : (recent.get(left.location) ?? Infinity) - (recent.get(right.location) ?? Infinity)) ||
        left.name.localeCompare(right.name)
      )
    })
}
