import { parsePreferencesDocument } from '../../../entities/preferences/model'
import { preferencesIpc } from '../ipc/preferences'

import type { PreferencesStore } from '../../../entities/preferences/model'
import type { Context } from '@opencode/plugin/gui'

export function createGuiPreferencesStore(context: Pick<Context, 'id' | 'main' | 'signal'>): PreferencesStore {
  const client = context.main(preferencesIpc(context.id))
  const options = () => ({ signal: AbortSignal.any([context.signal, AbortSignal.timeout(15_000)]) })

  return {
    async load() {
      const source: unknown = JSON.parse(await client.load(options()))

      return parsePreferencesDocument(source)
    },
    async update(change) {
      await client.update({ change: JSON.stringify(change) }, options())
    },
    async flush() {
      await client.flush(options())
    },
  }
}
