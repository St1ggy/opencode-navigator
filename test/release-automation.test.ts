import { afterEach, expect, test } from 'bun:test'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import metadata from '../package.json'
import { requiredContexts } from '../scripts/release/guards'

const directories: string[] = []

afterEach(() => {
  for (const directory of directories) rmSync(directory, { recursive: true, force: true })

  directories.length = 0
})

function run(scenario: string) {
  const directory = mkdtempSync(join(tmpdir(), 'navigator-release-runner-'))

  directories.push(directory)
  mkdirSync(join(directory, 'bin'))
  mkdirSync(join(directory, 'screenshots'))
  const executable = `#!${process.execPath}\n${readFileSync('test/fixtures/release-command.mjs', 'utf8')}`

  for (const tool of ['gh', 'git']) {
    const path = join(directory, 'bin', tool)

    writeFileSync(path, executable)
    chmodSync(path, 0o700)
  }

  const state = {
    scenario,
    repository: 'St1ggy/opencode-navigator',
    base: 'a'.repeat(40),
    head: 'b'.repeat(40),
    merge: 'c'.repeat(40),
    contexts: requiredContexts({
      v1: metadata.devDependencies['@opencode-ai/plugin'],
      v2: metadata.devDependencies['@opencode/plugin'],
    }),
  }

  writeFileSync(join(directory, 'state.json'), JSON.stringify(state))
  writeFileSync(join(directory, 'package.json'), JSON.stringify(metadata))
  writeFileSync(join(directory, 'screenshots/scene.png'), Buffer.from('89504e470d0a1a0a', 'hex'))
  const result = Bun.spawnSync([process.execPath, resolve('scripts/release.ts'), 'screenshots'], {
    cwd: directory,
    env: {
      ...process.env,
      PATH: `${directory}/bin:${process.env.PATH}`,
      GH_TOKEN: 'synthetic-not-a-credential',
      GITHUB_REPOSITORY: state.repository,
      GITHUB_RUN_ID: '10',
      GITHUB_RUN_ATTEMPT: '1',
      GITHUB_OUTPUT: join(directory, 'output'),
      RELEASE_SHA: state.base,
      RELEASE_APP_SLUG: 'release',
    },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const calls = readFileSync(join(directory, 'calls.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as { tool: string; args: string[] })

  return { result, calls, output: Bun.file(join(directory, 'output')), state }
}

test('unchanged screenshots complete without branches, PRs, approvals or merge calls', async () => {
  const { result, calls, output, state } = run('no-diff')

  expect(result.exitCode).toBe(0)
  expect(await output.text()).toBe(`sha=${state.base}\n`)
  expect(calls.some((call) => call.args.includes('push'))).toBe(false)
  expect(calls.some((call) => call.args.some((arg) => arg.includes('/pulls')))).toBe(false)
})

test('autonomous screenshot path arms auto-merge, runs exact-head CI and merges without reviews', async () => {
  const { result, calls, output, state } = run('success')

  expect(new TextDecoder().decode(result.stderr)).toBe('')
  expect(result.exitCode).toBe(0)
  expect(await output.text()).toContain(`sha=${state.merge}\n`)
  const auto = calls.findIndex((call) => call.args.includes('--auto'))
  const ci = calls.findIndex((call) => call.args.includes('workflow'))
  const merge = calls.findIndex((call) => call.args.includes('PUT'))

  expect(auto).toBeGreaterThan(0)
  expect(ci).toBeGreaterThan(auto)
  expect(merge).toBeGreaterThan(ci)
  expect(calls.some((call) => call.args.includes('review'))).toBe(false)
})

test.each(['failed-ci', 'wrong-ci-head', 'foreign-author', 'changed-head', 'source-change'])(
  '%s stops before any native merge',
  (scenario) => {
    const { result, calls } = run(scenario)

    expect(result.exitCode).not.toBe(0)
    expect(calls.some((call) => call.args.includes('PUT'))).toBe(false)
    expect(calls.some((call) => call.args.includes('review'))).toBe(false)
  },
)
