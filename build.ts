import solidPlugin from '@opentui/solid/bun-plugin'
import { readdir, unlink } from 'node:fs/promises'
import { basename, join } from 'node:path'

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

  if (source[index] === '\n') {
    let cursor = index + 1

    while (source[cursor] === ' ' || source[cursor] === '\t') cursor++

    if (source[cursor] === ')' || source[cursor] === ']') return { value: '', consumed: cursor - index - 1 }

    if (result.endsWith('}') && (',;}'.includes(source[cursor] ?? '') || source.startsWith('else', cursor)))
      return { value: '', consumed: cursor - index - 1 }
  }

  if (source[index] === ' ' && result.endsWith(',')) return { value: '', consumed: 0 }

  if (
    source[index] === ' ' &&
    source[index + 1] === '(' &&
    ['if', 'for', 'while', 'switch', 'catch', 'return'].some((keyword) => result.endsWith(keyword))
  )
    return { value: '', consumed: 0 }

  if (source[index] === ' ' && source[index + 1] === '{' && !result.endsWith('import'))
    return { value: '', consumed: 0 }

  if (source[index] === ' ' && ('({[:'.includes(result.at(-1) ?? '') || ')}],:'.includes(source[index + 1] ?? '')))
    return { value: '', consumed: 0 }

  if (source.startsWith(' => ', index)) return { value: '=>', consumed: 3 }

  if (source.startsWith(' - ', index) && !result.endsWith('-') && !'-/'.includes(source[index + 3] ?? ''))
    return { value: '-', consumed: 2 }

  for (const operator of ['===', '!==', '&&', '||', '??', '<=', '>=', '=', '<', '>', '?', '*', '%']) {
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
      if (!(lineStart && comment.value === '\n')) result += comment.value

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

function consolidateNamedImports(source: string) {
  const imports = new Map<string, string[]>()
  const pattern = /^import \{(.+)\} from (['"].+['"])$/gm

  for (const match of source.matchAll(pattern)) {
    const [, names, module] = match
    const current = imports.get(module) ?? []

    current.push(names)
    imports.set(module, current)
  }

  const emitted = new Set<string>()

  return source.replaceAll(pattern, (_statement, _names: string, module: string) => {
    if (emitted.has(module)) return ''

    emitted.add(module)
    const names = imports.get(module) ?? []
    const specifiers = [...new Set(names.flatMap((value) => value.split(',')))].join(',')

    return `import {${specifiers}} from ${module}`
  })
}

function consolidateGeneratedHelpers(source: string) {
  // JSX transforms alias the same OpenTUI helper separately in each module.
  return source.replaceAll(
    /_\$(?:createComponent|createElement|createTextNode|insertNode|mergeProps|setProp|effect|insert|memo|spread|use)\d{1,3}\b/g,
    (name) => name.replaceAll(/\d{1,3}$/g, ''),
  )
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
  if (output.kind !== 'entry-point') continue

  const text = await output.text()
  const compacted = stripGeneratedIndentation(text)
  const bundled = consolidateNamedImports(consolidateGeneratedHelpers(compacted))

  await Bun.write(output.path, bundled)
}

const dialogs = await Bun.build({
  entrypoints: [
    'src/mcp-groups.ts',
    'src/skill-groups.ts',
    'src/quick-actions-settings.ts',
    'src/settings-import.ts',
    'src/trusted-skills.ts',
    'src/layout-preset-actions.ts',
    'src/provider-limits.ts',
  ],
  outdir: 'dist',
  target: 'bun',
  format: 'esm',
  splitting: true,
  external: [
    '@opencode-ai/plugin',
    '@opencode/plugin',
    '@opentui/core',
    '@opentui/keymap',
    '@opentui/solid',
    'solid-js',
  ],
  plugins: [
    solidPlugin,
    {
      name: 'share-navigator-ui',
      setup(build) {
        build.onResolve({ filter: /shared\/ui(?:$|\/)/ }, () => ({ path: './tui.js', external: true }))
      },
    },
  ],
})

if (!dialogs.success) {
  for (const log of dialogs.logs) console.error(log)
  process.exit(1)
}

for (const output of dialogs.outputs) {
  if (output.kind === 'entry-point' || output.kind === 'chunk')
    await Bun.write(output.path, stripGeneratedIndentation(await output.text()))
}

const generated = new Set(dialogs.outputs.map((output) => basename(output.path)))
const outputFiles = await readdir('dist')

for (const name of outputFiles) {
  if (/^chunk-[\da-z]+\.js$/u.test(name) && !generated.has(name)) await unlink(join('dist', name))
}

for (const entrypoint of ['src/server.ts', 'src/rpc.ts', 'src/project-profile.ts']) {
  const server = await Bun.build({
    entrypoints: [entrypoint],
    outdir: 'dist',
    target: 'bun',
    format: 'esm',
    external: [
      '@opencode/plugin',
      '@github/copilot-sdk',
      '@opencode/schema',
      '@opencode/client',
      '@opentui/core',
      '@opentui/solid',
      'solid-js',
    ],
  })

  if (!server.success) {
    for (const log of server.logs) console.error(log)
    process.exit(1)
  }

  for (const output of server.outputs) {
    if (output.kind === 'entry-point') await Bun.write(output.path, stripGeneratedIndentation(await output.text()))
  }
}
