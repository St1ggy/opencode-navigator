import { createEffect, createMemo, untrack } from 'solid-js'

import type { PreferencesController } from '../../../entities/preferences'
import type { SkillController } from '../../../entities/skill'

export function createSkillGroupsModel(skills: SkillController, preferences: PreferencesController) {
  const target = createMemo(() => skills.target())

  createEffect(() => {
    const current = target()

    untrack(() => void skills.refresh(current).catch(() => {}))
  })

  const options = createMemo(() => {
    const live = new Map(skills.list(target()).map((skill) => [skill.location, skill]))
    const assigned = preferences.skillGroups?.() ?? {}
    const entries = [...new Set([...live.keys(), ...Object.keys(assigned)])]
      .filter(Boolean)
      .sort((left, right) => {
        const label = (location: string) => live.get(location)?.name ?? location.split('/').at(-2) ?? location

        return label(left).localeCompare(label(right)) || left.localeCompare(right)
      })
      .map((location) => ({
        title: live.get(location)?.name ?? location.split('/').at(-2) ?? location,
        value: location,
        description: [assigned[location] ?? 'Ungrouped', !live.has(location) && 'not in workspace', location]
          .filter(Boolean)
          .join(' · '),
      }))
    const state = skills.state(target())

    if (state.error)
      entries.push({ title: 'Retry loading skills', value: '__retry__', description: state.error.message })

    if (entries.length === 0)
      entries.push({
        title: state.status === 'loading' ? 'Loading skills…' : 'No skills in this workspace',
        value: '__empty__',
        description: '',
      })

    return entries
  })

  return { options, retry: () => skills.refresh(target(), true) }
}
