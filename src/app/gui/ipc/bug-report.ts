import { Ipc } from '@opencode/plugin/gui'
import { Schema } from 'effect'

const draft = Schema.Struct({
  title: Schema.String.check(Schema.isMaxLength(256)),
  body: Schema.String.check(Schema.isMaxLength(60_000)),
})

export function bugReportIpc(pluginID: string) {
  return Ipc.define({
    id: `${pluginID}.bug-report`,
    methods: {
      probe: {
        output: Schema.Struct({
          status: Schema.Literals(['checking', 'ready', 'missing', 'unauthenticated', 'unsupported']),
          message: Schema.String,
        }),
      },
      prepare: { input: draft, output: Schema.String },
      send: {
        input: Schema.Struct({ token: Schema.String, draft }),
        output: Schema.Struct({
          status: Schema.Literals(['created', 'partial', 'failed', 'uncertain']),
          message: Schema.String,
          url: Schema.optional(Schema.String),
        }),
      },
    },
  })
}
