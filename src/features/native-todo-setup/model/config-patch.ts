import { applyEdits, findNodeAtLocation, modify, parseTree } from 'jsonc-parser'

import type { Node, ParseError } from 'jsonc-parser'

function unique(node: Node, key: string) {
  const matches = node.children?.filter((property) => property.children?.[0].value === key) ?? []

  if (matches.length > 1) throw new Error(`Duplicate ${key} fields; edit this configuration manually.`)
}

export function enableTodoConfig(source: string) {
  if (source.length > 1_000_000) throw new Error('The configuration is too large to edit safely.')

  const prefix = source.startsWith('\u{FEFF}') ? '\u{FEFF}' : ''
  const text = source.slice(prefix.length)
  const errors: ParseError[] = []
  const root = parseTree(text, errors, { allowTrailingComma: true })

  if (errors.length > 0 || root?.type !== 'object')
    throw new Error('The configuration is not a valid JSON/JSONC object.')

  unique(root, 'experimental')
  const experimental = findNodeAtLocation(root, ['experimental'])

  if (experimental && experimental.type !== 'object') throw new Error('experimental must be an object.')

  if (experimental) unique(experimental, 'todo')

  const todo = findNodeAtLocation(root, ['experimental', 'todo'])

  if (todo && todo.type !== 'boolean') throw new Error('experimental.todo must be a boolean.')

  const edits = modify(text, ['experimental', 'todo'], true, {
    formattingOptions: {
      insertSpaces: !/^\t/mu.test(source),
      tabSize: 2,
      eol: source.includes('\r\n') ? '\r\n' : '\n',
    },
  })

  return prefix + applyEdits(text, edits)
}
