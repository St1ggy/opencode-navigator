import { createNativeSkillSource } from '../native/skill-source'

import type { Plugin } from '@opencode/plugin/tui'

export function createV2SkillSource(context: Plugin.Context) {
  return createNativeSkillSource({
    data: () => context.data,
    async use(target, skill, signal) {
      const route = context.ui.router.current()
      const session = route.type === 'session' && context.data.session.get(route.sessionID)

      if (route.type !== 'session' || !session || session.location.directory !== target.routing.directory || !skill.id)
        throw new Error('Skill target changed; select the source again')

      await context.client.experimental.session.skill({ sessionID: route.sessionID, id: skill.id }, { signal })

      return !signal.aborted
    },
  })
}
