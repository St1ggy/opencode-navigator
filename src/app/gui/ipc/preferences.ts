import { Ipc } from '@opencode/plugin/gui'
import { Schema } from 'effect'

export function preferencesIpc(pluginID: string) {
  return Ipc.define({
    id: `${pluginID}.preferences`,
    methods: {
      load: { output: Schema.String },
      update: { input: Schema.Struct({ change: Schema.String }) },
      flush: {},
    },
  })
}
