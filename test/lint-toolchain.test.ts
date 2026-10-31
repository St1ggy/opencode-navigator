import solid from '@st1ggy/linter-config/solid-ox'
import { expect, test } from 'bun:test'

import config from '../oxlint.config'
import metadata from '../package.json'
import { NATIVE_SONAR_RULES, nativeLintConfig } from '../scripts/native-lint-config'

test('lint migration preserves native options and uses native TypeScript checks without loading TS6 plugins', () => {
  const migrated = nativeLintConfig({
    plugins: ['typescript'],
    jsPlugins: [
      { name: 'sonarjs', specifier: 'sonarjs' },
      { name: 'typescript-js', specifier: 'typescript' },
      { name: 'solid', specifier: 'solid' },
    ],
    rules: {
      'typescript-js/array-type': 'error',
      'typescript-js/prefer-as-const': 'error',
      'sonarjs/cognitive-complexity': 'error',
      'sonarjs/no-unused-vars': 'error',
      'eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  })

  expect(migrated.jsPlugins).toEqual([{ name: 'solid', specifier: 'solid' }])
  expect(migrated.rules?.['typescript/array-type']).toBe('error')
  expect(migrated.rules?.['typescript/prefer-as-const']).toBe('error')
  expect(migrated.rules?.['eslint/no-unused-vars']).toEqual(['error', { argsIgnorePattern: '^_' }])
  expect(JSON.stringify(config)).not.toContain('sonarjs/')
  expect(JSON.stringify(config)).not.toContain('typescript-js/')
  expect(JSON.stringify(config)).toContain('solid/')
})

test('the approved coverage inventory lists every removed SonarJS preset check', async () => {
  const names = new Set(
    solid.overrides
      ?.flatMap((override) => Object.keys(override.rules ?? {}))
      .filter((name) => name.startsWith('sonarjs/')),
  )
  const removed = [...names].filter((name) => !(name in NATIVE_SONAR_RULES)).sort()
  const documentation = await Bun.file(new URL('../LINT_COVERAGE.md', import.meta.url)).text()
  const documented = [...documentation.matchAll(/^sonarjs\/[a-z\d-]+$/gmu)].map(([name]) => name).sort()

  expect(documented).toEqual(removed)
})

test('the resolved project graph contains TypeScript 7 only, including the shared linter dependency tree', async () => {
  const lock = Bun.JSONC.parse(await Bun.file(new URL('../bun.lock', import.meta.url)).text()) as {
    packages: Record<string, [string]>
  }
  const versions = Object.values(lock.packages as Record<string, [string]>)
    .filter(([name]) => name.startsWith('typescript@'))
    .map(([name]) => name.slice('typescript@'.length))

  expect(metadata.devDependencies.typescript).toMatch(/^7\./u)
  expect(versions).toEqual([metadata.devDependencies.typescript])
  expect(config.options?.typeAware).toBe(true)
})
