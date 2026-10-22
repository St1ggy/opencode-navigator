import { NavigatorTodoRpc } from './navigator-rpc'
import { normalizeTodoState } from './navigator-state'

import type { Rpc } from '@opencode/schema/rpc'

export const LegacyTodoArchiveRpc = {
  id: NavigatorTodoRpc.id,
  methods: { list: NavigatorTodoRpc.methods.list },
  events: {},
} as const satisfies Rpc.PortableDefinition

export async function readLegacyTodoArchive(get: (key: string) => Promise<unknown>, sessionID: string) {
  return normalizeTodoState(await get(`session.todo.${sessionID}`))
}
