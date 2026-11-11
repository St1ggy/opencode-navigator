import { Ipc } from '@opencode/plugin/gui'
import { Schema } from 'effect'

export const accountIpcText = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(4096))
const text = accountIpcText

export const localAccountTargetFields = {
  serverID: text,
  sessionID: text,
  directory: text,
  workspace: Schema.optional(text),
  providerID: text,
}
const target = Schema.Struct(localAccountTargetFields)
const connection = Schema.Struct({
  status: Schema.Literals(['ready', 'loading', 'unavailable', 'unsupported']),
  id: Schema.optional(text),
  accountID: Schema.optional(text),
  providerID: Schema.optional(text),
  method: Schema.optional(Schema.Literals(['api', 'oauth'])),
})

export function localAccountIpc(pluginID: string) {
  return Ipc.define({ id: `${pluginID}.local-account`, methods: { read: { input: target, output: connection } } })
}

export type LocalAccountTarget = typeof target.Type
