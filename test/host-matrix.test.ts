import { expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'

import metadata from '../package.json' with { type: 'json' }

test('real-host CI supports only the current stable host in each major line', async () => {
  const workflow = Bun.YAML.parse(await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8')) as {
    jobs: Record<string, { strategy: { matrix: { version: string[] } } }>
  }

  expect(workflow.jobs['opencode-smoke-v1'].strategy.matrix.version).toEqual([
    metadata.devDependencies['@opencode-ai/plugin'],
  ])
  expect(workflow.jobs['opencode-smoke-v2'].strategy.matrix.version).toEqual([
    metadata.devDependencies['@opencode/plugin'],
  ])
})
