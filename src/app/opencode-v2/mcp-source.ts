import { collectionLocation, syncCollection } from './host-collection'

import type { McpSource } from '../../entities/mcp'
import type { Plugin } from '@opencode/plugin/tui'

export function createV2McpSource(context: Plugin.Context): McpSource {
  const collection = context.data.location.mcp.server
  const projections = new WeakMap<object, ReturnType<McpSource['list']>[number]>()
  const list: McpSource['list'] = (target) =>
    (collection.list(collectionLocation(target)) ?? []).map((server) => {
      let item = projections.get(server)

      if (!item) {
        item = {
          get name() {
            return server.name
          },
          get title() {
            return server.title
          },
          get status() {
            return server.status.status
          },
          get error() {
            return 'error' in server.status ? server.status.error : undefined
          },
        }
        projections.set(server, item)
      }

      return item
    })

  return {
    list,
    async refresh(target, force, signal) {
      await syncCollection(collection, target, force, signal)

      return list(target)
    },
  }
}
