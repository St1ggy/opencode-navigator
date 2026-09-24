import type { Plugin } from '@opencode/plugin/tui'
import type { Session, SessionStatus } from '@opencode-ai/sdk/v2'

type V2Session = NonNullable<ReturnType<Plugin.Context['data']['session']['get']>>
type RequestOptions = { signal?: AbortSignal }

export function createV2SessionAdapter(context: Plugin.Context) {
  const statuses = new Map<string, SessionStatus>()

  function normalize(info: V2Session): Session {
    const directory = info.location.directory
    const workspaceID = context.location?.directory === directory ? context.location.workspaceID : undefined

    return {
      id: info.id,
      slug: info.id,
      projectID: info.projectID,
      ...(workspaceID && { workspaceID }),
      directory,
      ...(info.parentID && { parentID: info.parentID }),
      cost: Number(info.cost),
      tokens: info.tokens as Session['tokens'],
      title: info.title ?? 'Untitled session',
      ...(info.agent && { agent: info.agent }),
      ...(info.model && { model: info.model }),
      version: context.app.version,
      metadata: info.metadata,
      time: {
        created: info.time.created,
        updated: info.time.updated,
        ...(info.time.archived && { archived: info.time.archived }),
      },
    }
  }

  function status(sessionID: string): SessionStatus {
    const cached = statuses.get(sessionID)

    if (cached) return cached

    return context.data.session.status(sessionID) === 'running' ? { type: 'busy' } : { type: 'idle' }
  }

  return {
    normalize,
    setStatus(sessionID: string, value: SessionStatus) {
      statuses.set(sessionID, value)
    },
    state: {
      count: () => context.data.session.list().length,
      get: (sessionID: string) => {
        const value = context.data.session.get(sessionID)

        return value ? normalize(value) : undefined
      },
      todo: () => [],
      status,
    },
    client: {
      async children(input: { sessionID: string; directory?: string }, options: RequestOptions = {}) {
        const response = await context.client.session.list(
          { parentID: input.sessionID, ...(input.directory && { directory: input.directory }) },
          { signal: options.signal },
        )

        return { data: response.data.map((session) => normalize(session)) }
      },
      async status(_input: { directory?: string }, options: RequestOptions = {}) {
        const active = await context.client.session.active({ signal: options.signal })
        const data = Object.fromEntries(
          context.data.session
            .list()
            .map((session) => [
              session.id,
              statuses.get(session.id) ?? (active[session.id] ? { type: 'busy' as const } : { type: 'idle' as const }),
            ]),
        )

        return { data }
      },
      async todo() {
        return { data: [] }
      },
    },
  }
}
