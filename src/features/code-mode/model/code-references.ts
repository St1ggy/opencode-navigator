import { referenceTokens } from './reference-tokens'

import type { ReferenceToken } from './reference-tokens'

export type ExecuteCodeReference = { namespace: string; method: string }
export type ExecuteCodeReferences = { items: ExecuteCodeReference[]; incomplete: boolean }

function property(tokens: ReferenceToken[], index: number) {
  let cursor = index

  if (tokens[cursor]?.text === '.' || tokens[cursor]?.text === '?.') {
    cursor++

    if (tokens[cursor]?.kind === 'name' && /^[A-Za-z_$]/u.test(tokens[cursor].text))
      return { value: tokens[cursor].text, next: cursor + 1 }
  }

  if (tokens[cursor]?.text === '[' && tokens[cursor + 1]?.kind === 'string' && tokens[cursor + 2]?.text === ']')
    return { value: tokens[cursor + 1].text, next: cursor + 3 }

  return { value: '', next: index }
}

export function executeCodeReferences(input: unknown): ExecuteCodeReferences {
  if (!input || typeof input !== 'object' || !('code' in input) || typeof input.code !== 'string')
    return { items: [], incomplete: true }

  const { tokens, limited } = referenceTokens(input.code)
  const items: ExecuteCodeReference[] = []
  const seen = new Set<string>()
  let incomplete = limited

  for (const [index, token] of tokens.entries()) {
    if (token.kind !== 'name' || token.text !== 'tools' || ['.', '?.'].includes(tokens[index - 1]?.text)) continue

    const namespace = property(tokens, index + 1)
    const method = property(tokens, namespace.next)

    if (!namespace.value || !method.value || /[\p{Cc}\p{Cf}]/u.test(namespace.value + method.value)) {
      incomplete = true
      continue
    }

    const key = JSON.stringify([namespace.value, method.value])

    if (seen.has(key)) continue

    if (items.length === 64) {
      incomplete = true
      break
    }

    seen.add(key)
    items.push({ namespace: namespace.value, method: method.value })
  }

  return { items, incomplete }
}

export function executeReferenceView(
  references: ExecuteCodeReferences,
  limit = references.items.length,
  origin = true,
) {
  const visible = references.items.slice(0, limit)
  const caption: string[] = []

  if (origin) caption.push(references.items.length > 0 ? 'In code' : 'No static reference identified')

  if (references.incomplete && references.items.length > 0) caption.push('Some references unresolved')

  if (visible.length < references.items.length)
    caption.push(`+${references.items.length - visible.length} code references`)

  return { visible, caption: caption.join(' · ') }
}
