import { Schema } from 'effect'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { parsePendingResetAttempt } from '../../../entities/preferences/model'
import { createPreferencesStore } from '../../../entities/preferences/storage'
import { QUICK_ACTION_IDS, SIDEBAR_SECTIONS } from '../../../shared/config'
import { PreferencesChange } from '../ipc/preferences-schema'

import type { PreferencesStore } from '../../../entities/preferences/model'

export function desktopPreferencesStore() {
  const state = process.env.XDG_STATE_HOME ?? join(homedir(), '.local', 'state')

  return createPreferencesStore(join(state, 'opencode'))
}

export function createMainPreferencesHandlers(store: PreferencesStore) {
  const decode = Schema.decodeUnknownSync(PreferencesChange, { onExcessProperty: 'error' })

  return {
    async load(_input: void, caller: { signal: AbortSignal }) {
      caller.signal.throwIfAborted()
      const document = await store.load()

      caller.signal.throwIfAborted()

      return JSON.stringify(document)
    },
    async update(input: { change: string }, caller: { signal: AbortSignal }) {
      caller.signal.throwIfAborted()

      if (input.change.length > 1_000_000) throw new Error('Navigator preferences update is too large')

      let change

      try {
        change = decode(JSON.parse(input.change))

        if (change.user?.pendingResetAttempt && !parsePendingResetAttempt(change.user.pendingResetAttempt))
          throw new Error('Invalid reset attempt')

        const actionIDs = new Set<string>(QUICK_ACTION_IDS)
        const sectionIDs = new Set<string>(SIDEBAR_SECTIONS)

        if (
          Object.keys(change.behavior?.quickActionVisibility ?? {}).some((id) => !actionIDs.has(id)) ||
          Object.keys(change.behavior?.sectionItemLimits ?? {}).some((id) => !sectionIDs.has(id))
        )
          throw new Error('Unknown Navigator preference key')
      } catch {
        throw new Error('Invalid Navigator preferences update')
      }

      // The existing lock/reducer performs one atomic mutation. Do not race a cancelled
      // IPC against a second write; Reload/flush reconciles a write already in progress.
      await store.update(change)
    },
    async flush(_input: void, caller: { signal: AbortSignal }) {
      caller.signal.throwIfAborted()
      await store.flush()
    },
  }
}
