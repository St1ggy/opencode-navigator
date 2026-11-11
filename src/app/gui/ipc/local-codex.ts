import { Ipc } from '@opencode/plugin/gui'
import { Schema } from 'effect'

import { localAccountTargetFields, accountIpcText as text } from './local-account'

const target = Schema.Struct({
  ...localAccountTargetFields,
  modelID: text,
  variant: Schema.optional(text),
  accountID: Schema.optional(text),
  connectionID: Schema.optional(text),
})
const snapshot = Schema.String.check(Schema.isMaxLength(1_000_000))

export function localCodexIpc(pluginID: string) {
  return Ipc.define({
    id: `${pluginID}.local-codex`,
    methods: {
      discover: { input: target, output: Schema.Struct({ accountID: text, connectionID: text }) },
      read: { input: target, output: snapshot },
      prepare: { input: Schema.Struct({ target, creditID: Schema.optional(text) }), output: snapshot },
      consume: {
        input: Schema.Struct({ target, idempotencyKey: text, uncertain: Schema.Boolean }),
        output: Schema.Literals(['reset', 'nothingToReset', 'noCredit', 'alreadyRedeemed']),
      },
    },
  })
}
