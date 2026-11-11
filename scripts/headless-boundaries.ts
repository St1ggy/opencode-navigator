import { existsSync, readFileSync } from 'node:fs'
import { builtinModules } from 'node:module'
import { dirname, relative, resolve, sep } from 'node:path'
import ts from 'typescript'

const FORBIDDEN_IMPORT = /^(?:node:|bun(?::|$)|electron(?:\/|$)|@opentui\/|@opencode(?:-ai)?\/)/u
const FORBIDDEN_GLOBAL = /\b(?:Bun|process|fetch|window|document|HTMLElement|localStorage|sessionStorage)\b/u
const rank = (layer: string) => ['shared', 'entities', 'features', 'widgets', 'pages', 'app'].indexOf(layer)

function invalidLayerImport(file: string, target: string) {
  const from = relative(resolve('src'), file).split(sep)
  const to = relative(resolve('src'), target).split(sep)

  return (
    rank(to[0]) > rank(from[0]) ||
    (from[0] === to[0] && ['entities', 'features', 'pages'].includes(from[0]) && from[1] !== to[1])
  )
}

export const HEADLESS_ENTRIES = [
  'src/entities/skill/model.ts',
  'src/entities/mcp/model.ts',
  'src/entities/subagent/model.ts',
  'src/entities/todo/model.ts',
  'src/entities/preferences/model.ts',
  'src/entities/provider-limit/model.ts',
  'src/entities/quick-action/model.ts',
  'src/entities/navigator-release/model.ts',
  'src/features/search-everything/model.ts',
  'src/features/sidebar-settings/model.ts',
  'src/features/provider-limits/model.ts',
  'src/pages/navigator/model.ts',
  'src/features/native-todo-setup/model.ts',
  'src/features/pinned-toolbar/model.ts',
  'src/shared/lib/location/identity.ts',
  'src/shared/lib/lifecycle/index.ts',
]

export function headlessViolations(entries = HEADLESS_ENTRIES, overrides: Record<string, string> = {}) {
  const pending = entries.map((entry) => resolve(entry))
  const visited = new Set<string>()
  const violations: string[] = []
  const sourceFor = (file: string) => overrides[relative(process.cwd(), file)] ?? readFileSync(file, 'utf8')

  while (pending.length > 0) {
    const file = pending.pop()!

    if (visited.has(file)) continue

    visited.add(file)
    const source = sourceFor(file)

    for (const item of ts.preProcessFile(source, true, true).importedFiles) {
      const specifier = item.fileName

      if (FORBIDDEN_IMPORT.test(specifier) || builtinModules.includes(specifier))
        violations.push(`${relative(process.cwd(), file)}: ${specifier}`)

      if (specifier.startsWith('.')) {
        const path = resolve(dirname(file), specifier)
        const target = [path, `${path}.ts`, `${path}.tsx`, `${path}/index.ts`, `${path}/index.tsx`].find((candidate) =>
          candidate.endsWith('.ts') || candidate.endsWith('.tsx') ? existsSync(candidate) : false,
        )

        if (!target) throw new Error(`Unresolved headless dependency: ${file} -> ${specifier}`)

        if (/\/(?:ui|server)\//u.test(target))
          violations.push(`${relative(process.cwd(), file)}: presentation/IO ${specifier}`)

        if (invalidLayerImport(file, target))
          violations.push(`${relative(process.cwd(), file)}: FSD import ${specifier}`)

        pending.push(target)
      }
    }
  }

  const options = { noResolve: true, noLib: true, types: [], target: ts.ScriptTarget.ES2022 }
  const host = ts.createCompilerHost(options)

  host.getSourceFile = (file, version) =>
    visited.has(file) ? ts.createSourceFile(file, sourceFor(file), version, true) : undefined
  const program = ts.createProgram([...visited], options, host)
  const checker = program.getTypeChecker()

  for (const file of program.getSourceFiles()) {
    const inspect = (node: ts.Node) => {
      if (ts.isIdentifier(node) && FORBIDDEN_GLOBAL.test(node.text)) {
        const symbol = checker.getSymbolAtLocation(node)
        const declaredLocally = symbol?.declarations?.some((declaration) =>
          visited.has(declaration.getSourceFile().fileName),
        )

        if (!declaredLocally) violations.push(`${relative(process.cwd(), file.fileName)}: platform global ${node.text}`)
      }

      ts.forEachChild(node, inspect)
    }

    inspect(file)
  }

  return { visited: [...visited], violations }
}
