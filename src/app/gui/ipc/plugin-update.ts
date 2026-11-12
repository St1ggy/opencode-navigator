import { Ipc } from '@opencode/plugin/gui'
import { Schema } from 'effect'

export function pluginUpdateIpc(pluginID: string) {
  return Ipc.define({
    id: `${pluginID}.package-update`,
    state: Schema.Struct({ phase: Schema.Literals(['idle', 'preparing', 'downloading', 'installing', 'verifying']) }),
    methods: {
      check: {
        output: Schema.Struct({
          status: Schema.Literals(['current', 'available', 'unsupported']),
          message: Schema.String,
          token: Schema.optional(Schema.String),
          latest: Schema.optional(Schema.String),
        }),
      },
      install: { input: Schema.Struct({ token: Schema.String }) },
    },
  })
}
