import solidPlugin from '@opentui/solid/bun-plugin'

type ScannerState = 'code' | 'single' | 'double' | 'template' | 'line-comment' | 'block-comment'
type ScannerTransition = { state: ScannerState; escaped: boolean; consumeNext?: boolean }

const QUOTE_STATES = { "'": 'single', '"': 'double', '`': 'template' } as const
const QUOTE_END = { single: "'", double: '"', template: '`' } as const
const CONTINUATION_PREFIXES = new Set(['(', '[', '`', '/', '+', '-', '.', '?'])

// Keep names and syntax readable while removing generated layout and module markers.
function transition(
  state: ScannerState,
  character: string,
  next: string | undefined,
  escaped: boolean,
): ScannerTransition {
  if (escaped) return { state, escaped: false }

  if (state === 'line-comment') return { state: character === '\n' ? 'code' : state, escaped: false }

  if (state === 'block-comment')
    return character === '*' && next === '/'
      ? { state: 'code', escaped: false, consumeNext: true }
      : { state, escaped: false }

  if (state !== 'code') {
    if (character === '\\') return { state, escaped: true }

    return { state: character === QUOTE_END[state] ? 'code' : state, escaped: false }
  }

  if (character === '/' && next === '/') return { state: 'line-comment', escaped: false }

  if (character === '/' && next === '*') return { state: 'block-comment', escaped: false }

  return { state: QUOTE_STATES[character as keyof typeof QUOTE_STATES] ?? state, escaped: false }
}

function compactSpacing(
  source: string,
  index: number,
  result: string,
  state: ScannerState,
): { value: string; consumed: number } | undefined {
  if (state !== 'code') return

  if (source[index] === '\n' && '({[,:'.includes(result.at(-1) ?? '')) return { value: '', consumed: 0 }

  if (source[index] === ' ' && result.endsWith(',')) return { value: '', consumed: 0 }

  if (source[index] === ' ' && ('({[:'.includes(result.at(-1) ?? '') || ')}],:'.includes(source[index + 1] ?? '')))
    return { value: '', consumed: 0 }

  if (source.startsWith(' => ', index)) return { value: '=>', consumed: 3 }

  for (const operator of ['===', '!==', '&&', '||', '??', '=']) {
    if (source.startsWith(` ${operator} `, index)) return { value: operator, consumed: operator.length + 1 }
  }

  return undefined
}

function compactComment(source: string, index: number, state: ScannerState) {
  if (state !== 'code' || source[index] !== '/') return

  if (source[index + 1] === '/') {
    const start = index

    while (source[index] !== '\n' && index < source.length) index++

    return { consumed: index - start, value: '\n', lineStart: true }
  }

  if (source[index + 1] !== '*') return

  const start = index

  index += 2
  while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) index++

  const multiline = source.slice(start, index).includes('\n')

  return { consumed: index + 1 - start, value: multiline ? '\n' : ' ', lineStart: multiline }
}

function stripGeneratedIndentation(source: string) {
  let state: ScannerState = 'code'
  let escaped = false
  let lineStart = true
  let result = ''

  for (let index = 0; index < source.length; index++) {
    const character = source[index]
    const next = source[index + 1]

    const comment = compactComment(source, index, state)

    if (comment) {
      result += comment.value
      index += comment.consumed
      lineStart = comment.lineStart

      continue
    }

    if (lineStart && state === 'code' && (character === ' ' || character === '\t')) continue

    if (lineStart && state === 'code' && character === '\n') continue

    const compacted = compactSpacing(source, index, result, state)

    if (compacted) {
      result += compacted.value
      index += compacted.consumed

      continue
    }

    if (state === 'code' && character === ';' && next === '\n') {
      let cursor = index + 2

      while (source[cursor] === ' ' || source[cursor] === '\t' || source[cursor] === '\n') cursor++

      if (!CONTINUATION_PREFIXES.has(source[cursor])) continue
    }

    result += character
    lineStart = character === '\n'
    const change = transition(state, character, next, escaped)

    state = change.state
    escaped = change.escaped

    if (change.consumeNext) {
      result += next
      index++
    }
  }

  return result
    .replaceAll(/^(import .+);$/gm, '$1')
    .replaceAll(/^(const|let|var) (.+?) = /gm, '$1 $2=')
    .replaceAll(/^(if|for|while|switch|catch) \(/gm, '$1(')
    .replaceAll(/^return \{/gm, 'return{')
}

const result = await Bun.build({
  entrypoints: ['src/tui.tsx'],
  outdir: 'dist',
  target: 'bun',
  format: 'esm',
  external: [
    '@opencode-ai/plugin',
    '@opencode/plugin',
    '@opentui/core',
    '@opentui/keymap',
    '@opentui/solid',
    'solid-js',
  ],
  plugins: [solidPlugin],
  define: {
    __NAVIGATOR_VERSION__: JSON.stringify(((await Bun.file('package.json').json()) as { version: string }).version),
  },
})

if (!result.success) {
  for (const log of result.logs) console.error(log)
  process.exit(1)
}

for (const output of result.outputs) {
  if (output.kind === 'entry-point') await Bun.write(output.path, stripGeneratedIndentation(await output.text()))
}
