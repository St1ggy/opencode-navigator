import { QUICK_ACTIONS } from './constants'

export type QuickActionId = (typeof QUICK_ACTIONS)[number]['command']
export type QuickActionVisibility = Partial<Record<QuickActionId, boolean>>
export const QUICK_ACTION_IDS = QUICK_ACTIONS.map((action) => action.command)

export function parseQuickActionOrder(value: unknown): QuickActionId[] | undefined {
  if (!Array.isArray(value)) return

  const order = [...new Set(value.filter((id): id is QuickActionId => QUICK_ACTION_IDS.includes(id)))]

  return [...order, ...QUICK_ACTION_IDS.filter((id) => !order.includes(id))]
}

export function parseQuickActionVisibility(value: unknown): QuickActionVisibility {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const input = value as Record<string, unknown>

  return Object.fromEntries(QUICK_ACTION_IDS.flatMap((id) => (typeof input[id] === 'boolean' ? [[id, input[id]]] : [])))
}
