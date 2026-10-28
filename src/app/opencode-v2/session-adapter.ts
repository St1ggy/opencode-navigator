import { createSignal } from 'solid-js'

import type { Plugin } from '@opencode/plugin/tui'
import type { Session, SessionStatus } from '@opencode-ai/sdk/v2'

type V2Session = NonNullable<ReturnType<Plugin.Context['data']['session']['get']>>
type RequestOptions = { signal?: AbortSignal }

export function createV2SessionAdapter(context: Plugin.Context) {
  const [retryDetails, setRetryDetails] = createSignal<Record<string, Extract<SessionStatus, { type: 'retry' }>>>({})
  const projections = new WeakMap<object, Session>()

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
    if (context.data.session.status(sessionID) !== 'running') return { type: 'idle' }

    const messages = context.data.session.message?.list?.(sessionID) ?? []
    let message: (typeof messages)[number] | undefined

    for (let index = messages.length - 1; index >= 0; index--) {
      const candidate = messages[index]

      if (candidate.type === 'assistant' && !candidate.time.completed) {
        message = candidate
        break
      }
    }

    if (message?.type === 'assistant' && message.retry)
      return {
        type: 'retry',
        attempt: message.retry.attempt,
        next: message.retry.at,
        message: message.retry.error.message,
      }

    return retryDetails()[sessionID] ?? { type: 'busy' }
  }

  function project(info: V2Session): Session {
    let value = projections.get(info)

    if (!value) {
      value = normalize(info)
      for (const key of [
        'id',
        'slug',
        'projectID',
        'workspaceID',
        'directory',
        'parentID',
        'cost',
        'tokens',
        'title',
        'agent',
        'model',
        'version',
        'metadata',
        'time',
      ] as const)
        Object.defineProperty(value, key, { enumerable: true, get: () => normalize(info)[key] })
      projections.set(info, value)
    }

    return value
  }

  return {
    normalize,
    project,
    status,
    setStatus(sessionID: string, value: SessionStatus) {
      setRetryDetails((current) => {
        const next = { ...current }

        if (value.type === 'retry') next[sessionID] = value
        else delete next[sessionID]

        return next
      })
    },
    state: {
      count: () => context.data.session.list().length,
      get: (sessionID: string) => {
        const value = context.data.session.get(sessionID)

        return value ? project(value) : undefined
      },
      todo: () => [],
      status,
    },
    client: {
      async create(input: { directory?: string }, options: RequestOptions = {}) {
        const directory = input.directory ?? context.location?.directory ?? context.data.location.default().directory
        const session = await context.client.session.create({ location: { directory } }, { signal: options.signal })

        return { data: normalize(session) }
      },
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
              active[session.id]
                ? (retryDetails()[session.id] ?? { type: 'busy' as const })
                : { type: 'idle' as const },
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
