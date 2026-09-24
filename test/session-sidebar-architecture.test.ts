import { expect, test } from 'bun:test'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const legacyFacades = [
  'src/tui.tsx',
  'src/search.ts',
  'src/icons/context.tsx',
  'src/icons/lsp.ts',
  'src/icons/ui.ts',
  'src/dialogs/context.tsx',
  'src/dialogs/first-run.tsx',
  'src/dialogs/keyboard-help.tsx',
  'src/dialogs/layout-preset-preview.tsx',
  'src/dialogs/mcp-preset-preview.tsx',
  'src/dialogs/mcp-presets.tsx',
  'src/dialogs/preset-preview-frame.tsx',
  'src/dialogs/quick-actions.tsx',
  'src/dialogs/search.tsx',
  'src/dialogs/settings.tsx',
  'src/dialogs/skill.tsx',
  'src/components/sidebar.tsx',
  'src/components/common.tsx',
  'src/components/dialog-action.tsx',
  'src/components/dialog-header.tsx',
  'src/components/dialog-surface.tsx',
  'src/components/section-tab.tsx',
  'src/components/list-visibility.tsx',
  'src/components/preset-preview-actions.tsx',
  'src/components/preset-preview-row.tsx',
  'src/components/preset-preview-summary.tsx',
  'src/components/search-binding.tsx',
  'src/components/section-boundary.tsx',
  'src/components/sections.tsx',
  'src/components/selection-box.tsx',
  'src/components/tab.tsx',
  'src/features/preset-preview/index.ts',
  'src/sidebar-interaction.ts',
  'src/config.ts',
  'src/constants.ts',
  'src/location.ts',
  'src/preferences-schema.ts',
  'src/preferences-store.ts',
  'src/preset-preview.ts',
  'src/quick-actions.ts',
  'src/state.ts',
  'src/subagent-view.ts',
  'src/todo-view.ts',
  'src/controllers/list-visibility.ts',
  'src/controllers/mcp.ts',
  'src/controllers/preferences.ts',
  'src/controllers/preset-preview.ts',
  'src/controllers/request-state.ts',
  'src/controllers/skills.ts',
  'src/controllers/subagent-history.ts',
  'src/controllers/subagents.ts',
  'src/controllers/todo.ts',
]

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name)

      return entry.isDirectory() ? sourceFiles(path) : [path]
    }),
  )

  return files.flat().filter((path) => /\.[jt]sx?$/.test(path))
}

test('legacy session sidebar and model modules remain re-export-only facades', async () => {
  for (const path of legacyFacades) {
    const source = await readFile(path, 'utf8')

    // Facades may use one or more multiline named/type/star re-exports, but no declarations.
    // eslint-disable-next-line sonarjs/regex-complexity
    expect(source).toMatch(/^(?:export\s+(?:type\s+)?(?:\*|\{[\s\S]*?\})\s+from\s+['"][^'"]+['"]\n?)+$/)
  }
})

test('session sidebar implementations do not import through components facades', async () => {
  const files = await sourceFiles('src/pages/session-sidebar')

  for (const path of files) {
    const source = await readFile(path, 'utf8')

    expect(source).not.toMatch(/from\s+['"][^'"]*components(?:\/|['"])/)
  }
})

test('page and feature implementations do not import legacy model facades', async () => {
  const files = [...(await sourceFiles('src/pages')), ...(await sourceFiles('src/features'))]
  const legacyModules = [
    'constants',
    'config',
    'location',
    'preferences-schema',
    'preferences-store',
    'preset-preview',
    'quick-actions',
    'state',
    'subagent-view',
    'todo-view',
  ]
  const legacyImport = new RegExp(
    String.raw`from\s+['"](?:\.\.\/)+(?:controllers\/|(?:${legacyModules.join('|')})['"])`,
  )

  for (const path of files) {
    const source = await readFile(path, 'utf8')

    expect(source).not.toMatch(legacyImport)
  }
})

test('entity slices stay isolated and consumers use entity public APIs', async () => {
  const entityFiles = await sourceFiles('src/entities')
  const productionFiles = [...entityFiles, ...(await sourceFiles('src/pages')), ...(await sourceFiles('src/features'))]

  for (const path of entityFiles) {
    const source = await readFile(path, 'utf8')

    expect(source).not.toMatch(/from\s+['"][^'"]*entities\//)
    expect(source).not.toMatch(
      /from\s+['"](?:\.\.\/){1,2}(?:mcp|preferences|quick-action|sidebar-layout|skill|subagent|todo)(?:\/|['"])/,
    )
  }
  for (const path of productionFiles) {
    const source = await readFile(path, 'utf8')

    expect(source).not.toMatch(/from\s+['"][^'"]*entities\/[^/'"]+\/(?:model|ui|lib)\//)
  }
})

test('Shared never imports an upper FSD layer', async () => {
  const files = await sourceFiles('src/shared')

  for (const path of files) {
    const source = await readFile(path, 'utf8')

    expect(source).not.toMatch(/from\s+['"][^'"]*(?:app|pages|features|entities)\//)
  }
})

test('feature slices stay isolated and external consumers use feature public APIs', async () => {
  const featureFiles = await sourceFiles('src/features')
  const consumers = [...(await sourceFiles('src/app')), ...(await sourceFiles('src/pages'))]

  for (const path of featureFiles) {
    if (path === 'src/features/preset-preview/index.ts') continue

    const source = await readFile(path, 'utf8')

    expect(source).not.toMatch(/from\s+['"][^'"]*features\//)
    expect(source).not.toMatch(/from\s+['"][^'"]*(?:app|pages)\//)
  }
  for (const path of consumers) {
    const source = await readFile(path, 'utf8')

    expect(source).not.toMatch(/from\s+['"][^'"]*features\/[^/'"]+\/(?:model|ui|lib)\//)
  }
})

test('entity implementations import only their own slice, Shared, or external modules', async () => {
  const files = await sourceFiles('src/entities')

  for (const path of files) {
    const source = await readFile(path, 'utf8')

    expect(source).not.toMatch(/from\s+['"][^'"]*(?:app|pages|features)\//)
    expect(source).not.toMatch(/from\s+['"][^'"]*entities\//)
  }
})

test('the app composes lower layers through public APIs', async () => {
  const files = await sourceFiles('src/app')

  for (const path of files) {
    const source = await readFile(path, 'utf8')

    expect(source).not.toMatch(/from\s+['"][^'"]*(?:entities|features|pages|shared)\/[^/'"]+\/(?:model|ui|lib)\//)
    expect(source).not.toMatch(/from\s+['"][^'"]*(?:components|dialogs|icons|controllers)\//)
  }
})

test('migrated UI modules remain focused', async () => {
  const files = [
    ...(await sourceFiles('src/features/search-everything/ui')),
    ...(await sourceFiles('src/features/sidebar-settings/ui')),
    ...(await sourceFiles('src/entities/skill/ui')),
    ...(await sourceFiles('src/shared/ui/dialog')),
    ...(await sourceFiles('src/shared/ui/icons')),
  ].filter((path) => path.endsWith('.tsx'))

  for (const path of files) {
    const source = await readFile(path, 'utf8')

    expect(source.split('\n').length - 1).toBeLessThanOrEqual(150)
  }
})
