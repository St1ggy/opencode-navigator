import { expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'

import metadata from '../package.json'

test('README uses real status sources, compatibility metadata and no npm-version badge', async () => {
  const readme = await readFile('README.md', 'utf8')
  const header = readme.slice(0, readme.indexOf('Search, navigate,'))

  expect(header).toContain('github/v/release/St1ggy/opencode-navigator')
  expect(header).toContain('ci.yml/badge.svg?branch=main&event=push')
  expect(header).toContain('publish.yml/badge.svg?event=release')
  expect(header).toContain('[Unit coverage reports](')
  expect(header).not.toContain('codecov')
  expect(header).not.toContain('shields.io/npm/v/')
  expect(header).toContain(`OpenCode%201.x-${metadata.devDependencies['@opencode-ai/plugin']}-`)
  expect(header).toContain(`OpenCode%202.x-${metadata.devDependencies['@opencode/plugin']}-`)
  expect(header).toContain('npm/dm/opencode-navigator')
  const footer = readme.slice(readme.lastIndexOf('\n## '))

  expect(footer).toStartWith('\n## Star History\n')
  expect(footer).toContain('(prefers-color-scheme: dark)')
  expect(footer).toContain('(prefers-color-scheme: light)')
  expect(footer).toContain('alt="Star history for OpenCode Navigator"')
  expect(footer).not.toContain('sealed_token')
})

test('coverage reports stay in read-only CI without an external upload job or skipped required checks', async () => {
  const workflow = Bun.YAML.parse(await readFile('.github/workflows/ci.yml', 'utf8')) as {
    permissions: Record<string, string>
    jobs: Record<
      string,
      {
        if?: string
        needs?: string
        permissions?: Record<string, string>
        steps: { run?: string; uses?: string; with?: Record<string, unknown> }[]
      }
    >
  }

  expect(workflow.permissions).toEqual({ contents: 'read' })
  for (const name of [
    'check',
    'opencode-smoke-v1',
    'opencode-smoke-v2',
    'headless-contracts',
    'corner-font',
    'desktop-smoke',
  ]) {
    expect(workflow.jobs[name].if).toBeUndefined()
    expect(workflow.jobs[name].permissions?.['id-token']).toBeUndefined()
  }
  expect(workflow.jobs.check.steps.some((step) => step.run === 'bun run check')).toBe(true)
  expect(workflow.jobs.check.steps.some((step) => step.run === 'bun run test:coverage')).toBe(true)
  expect(workflow.jobs['coverage-upload']).toBeUndefined()
  const artifact = workflow.jobs.check.steps.find((step) => step.uses?.startsWith('actions/upload-artifact@'))!

  expect(artifact.with).toMatchObject({ name: 'unit-coverage', path: 'coverage/', 'if-no-files-found': 'error' })
  expect(await Bun.file('codecov.yml').exists()).toBe(false)
})
