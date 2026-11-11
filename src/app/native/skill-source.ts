import { collectionLocation, syncCollection } from './host-collection'

import type { SkillInfo, SkillSource } from '../../entities/skill/model'
import type { Data } from '@opencode/client/solid'

export function createNativeSkillSource(input: {
  data(): { location: Pick<Data['location'], 'skill'> }
  use: SkillSource['use']
}): SkillSource {
  const projections = new WeakMap<object, SkillInfo>()
  const collection = () => input.data().location.skill
  const list: SkillSource['list'] = (target) =>
    (collection().list(collectionLocation(target)) ?? []).map((skill) => {
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
      const current = collection()

      await syncCollection(current, target, force, signal)

      if (collection() !== current) throw new DOMException('OpenCode connection changed', 'AbortError')

      return list(target)
    },
    async use(target, skill, signal) {
      signal.throwIfAborted()
      const actual = list(target).find((item) => item.id === skill.id && item.location === skill.location)

      if (!actual?.id) throw new Error('Skill target changed; select the source again')

      return input.use(target, actual, signal)
    },
  }
}
