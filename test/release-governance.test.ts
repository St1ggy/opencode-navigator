import { afterEach, expect, test } from 'bun:test'
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const directories: string[] = []

afterEach(() => {
  for (const directory of directories) rmSync(directory, { recursive: true, force: true })

  directories.length = 0
})

function runReleaseTail(review: string, ciFailure = false) {
  const directory = mkdtempSync(join(tmpdir(), 'navigator-release-governance-'))

  directories.push(directory)
  const calls = join(directory, 'calls')
  const summary = join(directory, 'summary')
  const gh = join(directory, 'gh')

  writeFileSync(
    gh,
    `#!/bin/sh
printf '%s\n' "$*" >> "$CALLS"
case "$1 $2" in
  'run watch') exit "$CI_EXIT" ;;
  'pr view') printf '%s\n' "$REVIEW" ;;
  'pr merge') exit 0 ;;
  *) exit 99 ;;
esac
`,
  )
  chmodSync(gh, 0o700)
  const source = readFileSync('.github/workflows/prepare-release.yml', 'utf8')
  const start = source.indexOf('          gh pr merge "$pr_url"')

  expect(start).toBeGreaterThan(0)
  const script = source
    .slice(start)
    .split('\n')
    .map((line) => line.slice(10))
    .join('\n')
  const result = Bun.spawnSync(['bash', '-e', '-s'], {
    stdin: Buffer.from(
      `ci_run_id=123\npr_url=https://github.com/synthetic/repository/pull/1\nhead_sha=synthetic-head\n${script}`,
    ),
    env: {
      PATH: `${directory}:/usr/bin:/bin`,
      CALLS: calls,
      GITHUB_STEP_SUMMARY: summary,
      REVIEW: review,
      CI_EXIT: ciFailure ? '1' : '0',
    },
    stdout: 'pipe',
    stderr: 'pipe',
  })

  return { exitCode: result.exitCode, calls: readFileSync(calls, 'utf8'), summary: Bun.file(summary) }
}

test('release screenshot automation enables auto-merge while owner review is pending', async () => {
  const result = runReleaseTail('REVIEW_REQUIRED')

  expect(result.exitCode).toBe(0)
  expect(result.calls).toContain('pr merge https://github.com/synthetic/repository/pull/1 --auto --squash')
  expect(result.calls).not.toContain('--admin')
  expect(await result.summary.text()).toContain('owner approval and all required checks remain mandatory')
})

test('release screenshot automation arms exact-head auto-merge before waiting for CI', () => {
  const result = runReleaseTail('APPROVED')

  expect(result.exitCode).toBe(0)
  expect(result.calls.indexOf('pr merge')).toBeLessThan(result.calls.indexOf('run watch'))
  expect(result.calls).toContain('--match-head-commit synthetic-head')
  expect(result.calls).not.toContain('--admin')
})

test('release screenshot automation reports failed CI without bypassing auto-merge gates', () => {
  const result = runReleaseTail('APPROVED', true)

  expect(result.exitCode).toBe(1)
  expect(result.calls).toContain('--auto')
  expect(result.calls).not.toContain('--admin')
  expect(result.calls.match(/pr merge/gu)).toHaveLength(1)
})

test('all repository paths have exactly one designated owner', () => {
  const rules = readFileSync('.github/CODEOWNERS', 'utf8')
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'))

  expect(rules).toEqual(['* @St1ggy'])
})

test('submitted reviews run the full PR-associated CI suite without skipped required jobs', () => {
  const source = readFileSync('.github/workflows/ci.yml', 'utf8')

  expect(source).toContain('pull_request_review:\n    types: [submitted]')
  expect(source).not.toContain('github.event.review.state')
  expect(source).not.toContain('pull_request_target:')
  expect(source).toContain('permissions:\n  contents: read')
})
