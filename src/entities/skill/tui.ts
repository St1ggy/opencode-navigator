import { currentLocation } from '../../shared/lib/location'

import { createSkillModel } from './model/skill-controller'

import type { SkillSource, SkillTarget } from './model/source'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function createSkillController(api: TuiPluginApi, source?: SkillSource) {
  const useNamed = async (target: SkillTarget, name: string, signal: AbortSignal) => {
    const result = await api.client.tui.appendPrompt(
      { ...target.routing, text: `/${name} ` },
      { throwOnError: true, signal },
    )

    return result.data ?? false
  }

  return createSkillModel({
    lifecycle: api.lifecycle,
    target: () => currentLocation(api),
    cache: source ? 'source' : 'model',
    source: source ?? {
      list: () => [],
      async refresh(target, _force, signal) {
        const result = await api.client.app.skills(target.routing, { throwOnError: true, signal })

        return result.data ?? []
      },
      use: (target, skill, signal) => useNamed(target, skill.name, signal),
    },
    onReconnect: (listener) => api.event.on('server.connected', listener),
    useNamed,
  })
}
