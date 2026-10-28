import { collectionLocation, syncCollection } from './host-collection'

import type { SkillInfo, SkillSource } from '../../entities/skill'
import type { Plugin } from '@opencode/plugin/tui'

export function createV2SkillSource(context: Plugin.Context): SkillSource {
  const projections = new WeakMap<object, SkillInfo>()
  const collection = context.data.location.skill
  const list: SkillSource['list'] = (target) =>
    (collection.list(collectionLocation(target)) ?? []).map((skill) => {
      let item = projections.get(skill)

      if (!item) {
        item = {
          get id() {
            return skill.id
          },
          get name() {
            return skill.name
          },
          get description() {
            return skill.description
          },
          get location() {
            return skill.path
          },
          get content() {
            return skill.content
          },
        }
        projections.set(skill, item)
      }

      return item
    })

  return {
    list,
    async refresh(target, force, signal) {
      await syncCollection(collection, target, force, signal)

      return list(target)
    },
    async use(target, skill, signal) {
      signal.throwIfAborted()
      const route = context.ui.router.current()
      const session = route.type === 'session' && context.data.session.get(route.sessionID)
      const actual = list(target).find((item) => item.id === skill.id && item.location === skill.location)

      if (
        route.type !== 'session' ||
        !session ||
        session.location.directory !== target.routing.directory ||
        !actual?.id
      )
        throw new Error('Skill target changed; select the source again')

      await context.client.session.skill({ sessionID: route.sessionID, id: actual.id }, { signal })

      return !signal.aborted
    },
  }
}
