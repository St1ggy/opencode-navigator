import type { Rpc } from '@opencode/schema/rpc'

const text = { type: 'string', minLength: 1, maxLength: 512 } as const
const model = {
  type: 'object',
  properties: {
    providerID: text,
    modelID: text,
    sessionID: text,
    connectionID: text,
    variant: text,
    force: { type: 'boolean' },
  },
  required: ['providerID', 'modelID', 'sessionID'],
  additionalProperties: false,
} as const

export const NavigatorQuotaRpc = {
  id: 'opencode-navigator.quotas',
  methods: {
    read: { input: model, output: { type: 'object', additionalProperties: true } },
    capabilities: {
      input: { type: 'object', additionalProperties: false },
      output: { type: 'array', items: { type: 'object', additionalProperties: true } },
    },
  },
  events: {
    updated: {
      schema: {
        type: 'object',
        properties: { providerID: text, modelID: text },
        required: ['providerID', 'modelID'],
        additionalProperties: false,
      },
    },
  },
} as const satisfies Rpc.PortableDefinition
