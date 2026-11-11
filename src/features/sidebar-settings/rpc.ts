import type { Rpc } from '@opencode/schema/rpc'

const text = { type: 'string', minLength: 1, maxLength: 1_000_000 } as const

export type ProjectProfilePreview = { token: string; after: string; file: string }

export const NavigatorProfilesRpc = {
  id: 'opencode-navigator.profiles',
  methods: {
    defaults: {
      input: { type: 'object', properties: { sessionID: text }, additionalProperties: false },
      output: { type: 'string', maxLength: 1_000_000 },
    },
    preview: {
      input: {
        type: 'object',
        properties: { sessionID: text, name: text, source: text, replace: { type: 'boolean' } },
        required: ['sessionID', 'name', 'source'],
        additionalProperties: false,
      },
      output: {
        type: 'object',
        properties: { token: text, after: text, file: text },
        required: ['token', 'after', 'file'],
        additionalProperties: false,
      },
    },
    save: {
      input: {
        type: 'object',
        properties: { sessionID: text, token: text },
        required: ['sessionID', 'token'],
        additionalProperties: false,
      },
      output: { type: 'object', properties: { file: text }, required: ['file'], additionalProperties: false },
    },
  },
  events: {},
} as const satisfies Rpc.PortableDefinition
