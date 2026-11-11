import type { SubagentSession, SubagentSource, SubagentStatus } from '../../entities/subagent/model'
import type { OpenCodeClient, SessionInfo } from '@opencode/client'

type NativeSessions = {
  list(): SessionInfo[]
  get(id: string): SessionInfo | undefined
  status(id: string): 'idle' | 'running'
  sync(id: string): Promise<void>
}

export function createNativeSubagentSource(input: {
  sessions(): NativeSessions
  client(): Pick<OpenCodeClient, 'session'>
  project(info: SessionInfo): SubagentSession | undefined
  status(id: string): SubagentStatus
}): SubagentSource {
  return {
    list: (parentID) =>
      input
        .sessions()
        .list()
        .filter((item) => item.parentID === parentID)
        .flatMap((item) => {
          const projected = input.project(item)

          return projected ? [projected] : []
        }),
    status: input.status,
    startedAt(id) {
      const sessions = input.sessions()

      if (sessions.status(id) !== 'running') return

      const time = sessions.get(id)?.time

      if (!time?.busy || (time.idle !== undefined && time.idle >= time.busy)) return

      return time.busy
    },
    async refresh(parentID, signal) {
      signal.throwIfAborted()
      const client = input.client()
      const sessions = input.sessions()
      let cursor: NonNullable<Parameters<typeof client.session.list>[0]>['cursor']

      do {
        const page = await client.session.list(cursor ? { cursor, limit: 100 } : { parentID, limit: 100 }, { signal })

        signal.throwIfAborted()

        if (input.client() !== client || input.sessions() !== sessions)
          throw new DOMException('Subagent connection changed', 'AbortError')

        await Promise.all(page.data.filter((item) => !sessions.get(item.id)).map((item) => sessions.sync(item.id)))
        cursor = page.cursor.next ?? undefined
        signal.throwIfAborted()
      } while (cursor)
    },
  }
}
