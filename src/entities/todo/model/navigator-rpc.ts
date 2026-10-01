import type { Rpc } from '@opencode/schema/rpc'

const item = {
  type: 'object',
  properties: {
    content: { type: 'string', minLength: 1, maxLength: 512 },
    status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled'] },
    priority: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['content', 'status'],
  additionalProperties: false,
} as const

const todos = { type: 'array', items: item, maxItems: 100 } as const
const sessionID = { type: 'string', minLength: 1 } as const
const output = {
  type: 'object',
  properties: { todos, guidance: { type: 'boolean' } },
  required: ['todos', 'guidance'],
  additionalProperties: false,
} as const

export const NavigatorTodoRpc = {
  id: 'opencode-navigator.todo',
  methods: {
    list: {
      input: { type: 'object', properties: { sessionID }, required: ['sessionID'], additionalProperties: false },
      output,
    },
    replace: {
      input: {
        type: 'object',
        properties: { sessionID, todos },
        required: ['sessionID', 'todos'],
        additionalProperties: false,
      },
      output,
    },
    guidance: {
      input: {
        type: 'object',
        properties: { sessionID, enabled: { type: 'boolean' } },
        required: ['sessionID', 'enabled'],
        additionalProperties: false,
      },
      output,
    },
  },
  events: {
    updated: {
      schema: {
        type: 'object',
        properties: { sessionID, todos, guidance: { type: 'boolean' } },
        required: ['sessionID', 'todos', 'guidance'],
        additionalProperties: false,
      },
    },
  },
} as const satisfies Rpc.PortableDefinition
