import { randomUUID } from 'node:crypto'

import type { UpdateProgress } from '../../../entities/navigator-release/model'
import type { PluginInfo } from '@opencode/client'
import type { MainContext } from '@opencode/plugin/gui/main'

function packageTarget(item: PluginInfo | undefined) {
  if (item?.source.type !== 'package') return

  const target = item.source.target

  // Only the established npm package may use the native package updater.
  // Local paths, file snapshots and unrelated packages must retain their source.
  return /^opencode-navigator(?:@[^/\\]+)?$/.test(target) ? target : undefined
}

function sourceIdentity(item: PluginInfo | undefined) {
  return JSON.stringify(
    item?.source.type === 'package'
      ? { type: 'package', target: item.source.target, version: item.source.version }
      : item?.source,
  )
}

export function createMainPluginUpdate(context: MainContext, changed: () => void = () => {}) {
  let prepared: { token: string; source: string; target: string } | undefined
  let busy = false
  let phase: UpdateProgress['phase'] | 'idle' = 'idle'
  const report = (next: typeof phase) => {
    phase = next
    changed()
  }

  return {
    state: () => ({ phase }),
    async check(_input: void, caller: { signal: AbortSignal }) {
      if (busy) throw new Error('Navigator installation is already in progress')

      prepared = undefined
      const client = context.client
      const signal = AbortSignal.any([context.signal, caller.signal, AbortSignal.timeout(20_000)])
      const response = await client.plugin.list({}, { signal })
      const item = response.data.find((entry) => entry.id === context.id)
      const target = packageTarget(item)

      if (!target)
        return {
          status: 'unsupported' as const,
          message:
            'This GUI uses a local or unrecognized source. Keep that installation method; update it through its existing installer.',
        }

      const checked = await client.plugin.check({ location: response.location, target }, { signal })
      const current = checked.data.find((entry) => entry.id === context.id)

      signal.throwIfAborted()

      if (context.client !== client || sourceIdentity(current) !== sourceIdentity(item))
        throw new Error('Navigator installation changed during the check. Check again.')

      if (current?.source.type !== 'package' || !current.source.outdated)
        return { status: 'current' as const, message: 'The native plugin manager reports Navigator is up to date.' }

      const token = randomUUID()

      prepared = { token, target, source: sourceIdentity(current) }

      return {
        status: 'available' as const,
        message: 'The native plugin manager found an update for this installation.',
        token,
      }
    },
    async install(input: { token: string }, caller: { signal: AbortSignal }) {
      if (busy || !prepared || input.token !== prepared.token)
        throw new Error('Update confirmation expired. Check again.')

      busy = true
      report('preparing')
      const expected = prepared

      prepared = undefined
      try {
        const client = context.client
        const signal = AbortSignal.any([context.signal, caller.signal, AbortSignal.timeout(120_000)])
        const response = await client.plugin.list({}, { signal })
        const item = response.data.find((entry) => entry.id === context.id)

        if (
          context.client !== client ||
          sourceIdentity(item) !== expected.source ||
          packageTarget(item) !== expected.target
        )
          throw new Error('Navigator installation changed. Check again before installing.')

        report('installing')
        await client.plugin.update({ location: response.location, targets: [expected.target] }, { signal })
      } finally {
        busy = false
        report('idle')
      }
    },
  }
}
