import { collectionLocation, syncCollection } from './host-collection'

import type { McpSource } from '../../entities/mcp/model'
import type { Data } from '@opencode/client/solid'

export function createNativeMcpSource(
  data: () => { location: { mcp: Pick<Data['location']['mcp'], 'server'> } },
): McpSource {
  const collection = () => data().location.mcp.server
  const projections = new WeakMap<object, ReturnType<McpSource['list']>[number]>()
  const list: McpSource['list'] = (target) =>
    (collection().list(collectionLocation(target)) ?? []).map((server) => {
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
      const current = collection()

      await syncCollection(current, target, force, signal)

      if (collection() !== current) throw new DOMException('OpenCode connection changed', 'AbortError')

      return list(target)
    },
  }
}
