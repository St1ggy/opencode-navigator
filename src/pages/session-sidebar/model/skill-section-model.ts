import { createEffect, createMemo, onCleanup, untrack } from 'solid-js'

import { createListVisibility } from '../../../shared/lib/list-visibility'
import { isAbortError } from '../../../shared/lib/request-state'
import { matchesFilter } from '../lib/matches-filter'

import type { PreferencesController } from '../../../entities/preferences'
import type { SkillController, SkillInfo } from '../../../entities/skill'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { Accessor } from 'solid-js'

export function createSkillSectionModel(
  props: { api: TuiPluginApi; controller: SkillController; preferences: PreferencesController },
  query: Accessor<string>,
) {
  const target = createMemo(() => props.controller.target())
  const recent = createMemo(
    () => new Map((props.preferences.recentSkills?.() ?? []).map((location, index) => [location, index])),
  )
  const list = createMemo(() => {
    const favorites = props.preferences.favoriteSkills?.() ?? new Set<string>()

    return [...props.controller.list(target())]
      .sort((left, right) => {
        const isLeftFavorite = favorites.has(left.location)
        const isRightFavorite = favorites.has(right.location)

        return (
          Number(isRightFavorite) - Number(isLeftFavorite) ||
          (isLeftFavorite
            ? 0
            : (recent().get(left.location) ?? Infinity) - (recent().get(right.location) ?? Infinity)) ||
          left.name.localeCompare(right.name)
        )
      })
      .map((item) => ({ ...item }))
  })
  const filtered = createMemo(() => list().filter((item) => matchesFilter(query(), item.name, item.description)))
  const visibility = createListVisibility({
    items: filtered,
    limit: () => props.preferences.sectionItemLimit?.('skills') ?? 0,
    resetKey: () => JSON.stringify([target().key, query()]),
  })
  const state = createMemo(() => props.controller.state(target()))

  createEffect(() => {
    const current = target()
    const deactivate = untrack(() => props.controller.activate?.(current) ?? (() => {}))

    onCleanup(deactivate)
    untrack(() => void props.controller.refresh(current).catch(() => {}))
  })

  async function useSkill(item: SkillInfo) {
    try {
      const isInserted = await props.controller.use(target(), item.name)

      if (isInserted) await props.preferences.recordSkillUse?.(item)
    } catch (error) {
      if (isAbortError(error)) return

      props.api.ui.toast({
        variant: 'error',
        title: 'Skills',
        message: error instanceof Error ? error.message : `Failed to insert /${item.name}`,
        duration: 5000,
      })
    }
  }

  function skillGroup(item: SkillInfo) {
    if (props.preferences.isFavoriteSkill?.(item)) return 'favorite'

    return recent().has(item.location) ? 'recent' : 'other'
  }

  return { target, recent, list, filtered, visibility, state, useSkill, skillGroup }
}
