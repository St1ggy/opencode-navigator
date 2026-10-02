import { createEffect, createMemo, onCleanup, untrack } from 'solid-js'

import { buildSkillGroupedView } from '../../../entities/skill'
import { createListVisibility } from '../../../shared/lib/list-visibility'
import { isAbortError } from '../../../shared/lib/request-state'
import { matchesFilter } from '../lib/matches-filter'

import type { PreferencesController } from '../../../entities/preferences'
import type { GroupedSkill, SkillController, SkillInfo } from '../../../entities/skill'
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
  const groups = createMemo(() => props.preferences.skillGroups?.() ?? {})
  const grouped = createMemo(() => Object.keys(groups()).length > 0)
  const list = createMemo(() =>
    buildSkillGroupedView(
      props.controller.list(target()),
      props.preferences.favoriteSkills?.() ?? new Set(),
      groups(),
      recent(),
    ),
  )
  const filtered = createMemo(() =>
    list().filter((item) => matchesFilter(query(), item.name, item.description, item.assignedGroup)),
  )
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

  function skillGroup(item: GroupedSkill) {
    if (grouped()) return item.bucket

    if (props.preferences.isFavoriteSkill?.(item)) return 'favorite'

    return recent().has(item.location) ? 'recent' : 'other'
  }

  return { target, recent, grouped, list, filtered, visibility, state, useSkill, skillGroup }
}
