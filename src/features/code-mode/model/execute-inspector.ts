import { createMemo, createSignal, untrack } from 'solid-js'

import { payloadText } from './routing'

import type { ExecuteRun } from './types'
import type { Accessor } from 'solid-js'

export const EXECUTE_PAYLOADS = ['input', 'output', 'error'] as const
export type ExecutePayload = (typeof EXECUTE_PAYLOADS)[number]

export function executePayloadLabel(kind: ExecutePayload) {
  if (kind === 'input') return 'Code'

  return kind === 'output' ? 'Response' : 'Error'
}

export function executePayloadAction(kind: ExecutePayload, expanded: boolean) {
  if (kind === 'input') return expanded ? 'Show code' : 'All execute parameters'

  if (kind === 'output') return expanded ? 'Show response' : 'Full response JSON'

  return expanded ? 'Show error' : 'Full error JSON'
}

function initialTab(run: ExecuteRun): ExecutePayload {
  if (run.error !== undefined) return 'error'

  return run.output === undefined ? 'input' : 'output'
}

function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export function executePayloadContent(kind: ExecutePayload, value: unknown, raw: boolean) {
  if (value === undefined) return { text: '', language: undefined, available: false }

  if (raw) return { text: JSON.stringify(value, undefined, 2), language: 'json', available: true }

  if (kind === 'input' && object(value) && typeof value.code === 'string')
    return { text: value.code, language: 'javascript', available: true }

  if (kind === 'output' && Array.isArray(value) && value.length === 1) {
    const part: unknown = value[0]

    if (object(part) && Object.keys(part).length === 2 && part.type === 'text' && typeof part.text === 'string')
      return { text: part.text, language: undefined, available: true }
  }

  return { text: payloadText(value), language: typeof value === 'string' ? undefined : 'json', available: true }
}

export function createExecuteInspector(run: Accessor<ExecuteRun>) {
  const initial = untrack(() => initialTab(run()))
  const [tab, setTab] = createSignal<ExecutePayload>(initial)
  const [raw, setRaw] = createSignal<Partial<Record<ExecutePayload, boolean>>>({})
  const [metadata, setMetadata] = createSignal(false)
  const positions = new Map<string, number>()
  const key = () => `${tab()}:${raw()[tab()] ? 'raw' : 'formatted'}`
  const canExpand = createMemo(
    () =>
      executePayloadContent(tab(), run()[tab()], false).text !== executePayloadContent(tab(), run()[tab()], true).text,
  )

  return {
    tab,
    setTab,
    raw: () => raw()[tab()] === true,
    canExpand,
    toggleRaw: () => {
      if (canExpand()) setRaw((current) => ({ ...current, [tab()]: !current[tab()] }))
    },
    metadata,
    toggleMetadata: () => setMetadata(!metadata()),
    key,
    content: createMemo(() => executePayloadContent(tab(), run()[tab()], raw()[tab()] === true)),
    move(delta: number) {
      setTab(EXECUTE_PAYLOADS[(EXECUTE_PAYLOADS.indexOf(tab()) + delta + 3) % 3])
    },
    position: (value: string) => positions.get(value) ?? 0,
    savePosition(value: string, top: number) {
      positions.set(value, Math.max(0, top))
    },
  }
}

export type ExecuteInspector = ReturnType<typeof createExecuteInspector>
