export type ReferenceToken = { text: string; kind: 'name' | 'string' | 'symbol' }

function quoted(source: string, start: number): { token?: ReferenceToken; next: number } {
  let escaped = false
  let hasEscape = false

  for (let index = start + 1; index < source.length; index++) {
    if (!escaped && source[index] === source[start])
      return {
        token: { kind: 'string' as const, text: hasEscape ? '' : source.slice(start + 1, index) },
        next: index + 1,
      }

    if (!escaped && source[index] === '\\') {
      escaped = true
      hasEscape = true
    } else escaped = false
  }

  return { next: source.length }
}

// This is a bounded lexical reader, not a JavaScript parser or execution tracer.
// Ambiguous slash/template syntax ends inspection rather than guessing its contents.
export function referenceTokens(source: string) {
  const tokens: ReferenceToken[] = []
  const end = Math.min(source.length, 200_000)
  let limited = source.length > end

  source = source.slice(0, end)
  let index = 0

  while (index < end && tokens.length < 50_000) {
    const char = source[index]

    if (/\s/u.test(char)) {
      index++
      continue
    }

    if (source.startsWith('//', index)) {
      const next = source.indexOf('\n', index + 2)

      index = next === -1 ? end : next + 1
      continue
    }

    if (source.startsWith('/*', index)) {
      const next = source.indexOf('*/', index + 2)

      if (next === -1) {
        limited = true
        break
      }

      index = next + 2
      continue
    }

    if (char === '/' || char === '`' || char === '#' || char.codePointAt(0)! > 127) {
      limited = true
      break
    }

    if (char === '"' || char === "'") {
      const value = quoted(source, index)

      if (!value.token) {
        limited = true
        break
      }

      tokens.push(value.token)
      index = value.next
      continue
    }

    if (/[\w$]/u.test(char)) {
      const start = index++

      while (index < end && /[\w$]/u.test(source[index])) index++

      tokens.push({ kind: 'name', text: source.slice(start, index) })
      continue
    }

    const text = source.startsWith('?.', index) ? '?.' : char

    tokens.push({ kind: 'symbol', text })
    index += text.length
  }

  return { tokens, limited: limited || index < end }
}
