import type { Plugin } from '@opencode/plugin/tui'
import type { TuiSidebarMcpItem } from '@opencode-ai/plugin/tui'

type Routing = { directory?: string }
type RequestOptions = { signal?: AbortSignal }

function location(input: Routing) {
  return input.directory ? { location: { directory: input.directory } } : {}
}

function mcpItem(server: { name: string; status: { status: string; error?: string } }): TuiSidebarMcpItem {
  return {
    name: server.name,
    status: server.status.status as TuiSidebarMcpItem['status'],
    ...(server.status.error && { error: server.status.error }),
  }
}

export function createV2ClientAdapter(context: Plugin.Context) {
  const skillIDs = new Map<string, string>()

  return {
    state: {
      mcp: () => (context.data.location.mcp.server.list(context.location) ?? []).map((server) => mcpItem(server)),
    },
    client: {
      app: {
        async skills(input: Routing, options: RequestOptions = {}) {
          const response = await context.client.skill.list(location(input), { signal: options.signal })
          const data = response.data.map((skill) => {
            skillIDs.set(skill.name, skill.id)

            return {
              name: skill.name,
              description: skill.description,
              location: skill.path,
              content: skill.content,
            }
          })

          return { data }
        },
      },
      tui: {
        async appendPrompt(input: Routing & { text: string }, options: RequestOptions = {}) {
          const route = context.ui.router.current()
          const name = /^\/([^\s]+)\s*$/u.exec(input.text)?.[1]
          const id = name ? skillIDs.get(name) : undefined

          if (route.type !== 'session' || !id) return { data: false }

          await context.client.session.skill({ sessionID: route.sessionID, id }, { signal: options.signal })

          return { data: true }
        },
      },
      mcp: {
        async status(input: Routing, options: RequestOptions = {}) {
          const response = await context.client.mcp.list(location(input), { signal: options.signal })
          const data = Object.fromEntries(response.data.map((server) => [server.name, server.status]))

          return { data }
        },
        async connect(input: Routing & { name: string }, options: RequestOptions = {}) {
          await context.client.mcp.connect({ server: input.name, ...location(input) }, { signal: options.signal })

          return { data: undefined }
        },
        async disconnect(input: Routing & { name: string }, options: RequestOptions = {}) {
          await context.client.mcp.disconnect({ server: input.name, ...location(input) }, { signal: options.signal })

          return { data: undefined }
        },
      },
    },
  }
}
