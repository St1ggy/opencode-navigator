import { applyEdits, findNodeAtLocation, getNodeValue, modify, parseTree } from 'jsonc-parser'

import type { ExecuteRun, RoutingEntry, RoutingState } from './types'
import type { Node, ParseError } from 'jsonc-parser'

function serverObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export function routingState(entries: RoutingEntry[], server: string): RoutingState {
  // Config entries are ordered low-to-high precedence by the host.
  const definitions = entries.filter((entry) => entry.servers && Object.hasOwn(entry.servers, server))
  const definition = definitions.at(-1)
  let value: Record<string, unknown> = {}

  for (const entry of definitions) {
    const next = entry.servers?.[server]

    if (serverObject(next)) value = { ...value, ...next }
  }

  if (!serverObject(value) || (value.type !== 'local' && value.type !== 'remote'))
    return { mode: 'unknown', explicit: false, reason: 'No public server configuration is available.' }

  if (value.codemode !== undefined && typeof value.codemode !== 'boolean')
    return { mode: 'unknown', explicit: false, reason: 'The configured routing mode is invalid.' }

  return {
    mode: value.codemode === false ? 'direct' : 'code',
    explicit: typeof value.codemode === 'boolean',
    source: definition?.path,
    ...(!definition?.path && { reason: 'This configuration source is not a writable file.' }),
  }
}

export function patchRouting(text: string, server: string, mode: 'code' | 'direct') {
  if (text.length > 1_000_000) throw new Error('The configuration is too large to edit safely.')

  const prefix = text.startsWith('\u{FEFF}') ? '\u{FEFF}' : ''

  text = text.slice(prefix.length)
  const errors: ParseError[] = []
  const tree = parseTree(text, errors, { allowTrailingComma: true })

  if (!tree || errors.length > 0 || tree.type !== 'object')
    throw new Error('The configuration is not valid JSONC. No changes were made.')

  const paths = [
    ['mcp', 'servers', server],
    ['mcp', server],
  ]
  const matches = paths.filter((candidate) => findNodeAtLocation(tree, candidate))

  if (matches.length > 1) throw new Error('The server definition is ambiguous. Review the source file manually.')

  const path = matches[0]
  const node = path && findNodeAtLocation(tree, path)
  const value = node && getNodeValue(node)

  if (!path || !node || node.type !== 'object' || !serverObject(value))
    throw new Error('The exact server definition is absent or the JSONC is invalid. No changes were made.')

  if (value.type !== undefined && value.type !== 'local' && value.type !== 'remote')
    throw new Error('This server definition cannot be edited safely.')

  for (const [index, key] of [...path, 'codemode'].entries()) {
    const parentPath = [...path, 'codemode'].slice(0, index)
    const parent: Node | undefined = findNodeAtLocation(tree, [...parentPath])
    const matching = parent?.children?.filter((child) => child.children?.[0].value === key) ?? []

    if (matching.length > 1)
      throw new Error('Duplicate configuration keys require manual review. No changes were made.')
  }

  const edits = modify(text, [...path, 'codemode'], mode === 'code', {
    formattingOptions: { insertSpaces: !text.includes('\t'), tabSize: 2, eol: text.includes('\r\n') ? '\r\n' : '\n' },
  })

  return prefix + applyEdits(text, edits)
}

export function payloadText(payload: unknown) {
  if (payload === undefined) return 'Not exposed by this host.'

  return typeof payload === 'string' ? payload : JSON.stringify(payload, undefined, 2)
}

export function executeDuration(run: ExecuteRun, now: number) {
  const start = run.started
  const end = run.completed ?? (run.status === 'running' || run.status === 'streaming' ? now : undefined)

  if (start === undefined || end === undefined || !Number.isFinite(start) || !Number.isFinite(end) || end < start)
    return 'Duration unavailable'

  return `${((end - start) / 1000).toFixed(1)}s`
}

export function executeTimestamp(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return 'Not exposed by this host.'

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? 'Invalid host timestamp.' : date.toISOString()
}
