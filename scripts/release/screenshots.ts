import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { runCI } from './ci'
import { api, command, environment, mainSha, output, pages, waitFor } from './github'
import { assertChecks, assertScreenshotFiles, assertScreenshotPull } from './guards'

import type { CheckRun, ScreenshotPull } from './guards'

export async function mergeScreenshots(repository: string, base: string, contexts: string[]) {
  assert.equal(mainSha(repository), base, 'Main changed during capture; start a new release')
  command('git', ['add', '--all', '--', ':(glob)screenshots/*.png', ':(glob)screenshots/gui/*.png'])
  const names = command('git', ['diff', '--cached', '--name-only', '-z']).split('\0').filter(Boolean)

  assert.equal(command('git', ['diff', '--name-only']), '', 'Capture modified non-screenshot sources')

  if (names.length === 0) {
    output('sha', base)

    return
  }

  assertScreenshotFiles(names.map((filename) => ({ filename, status: 'modified' })))
  for (const name of names) {
    assert.ok(readFileSync(name).subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')), `Not a PNG: ${name}`)
  }

  const branch = `automation/release-screenshots-${environment('GITHUB_RUN_ID')}-${environment('GITHUB_RUN_ATTEMPT')}`
  const bot = `${environment('RELEASE_APP_SLUG')}[bot]`

  command('git', ['config', 'user.name', bot])
  command('git', ['config', 'user.email', `${bot}@users.noreply.github.com`])
  command('git', ['switch', '--create', branch])
  command('git', ['commit', '--message', 'Refresh release screenshots'])
  const head = command('git', ['rev-parse', 'HEAD'])

  command('gh', ['auth', 'setup-git'])
  command('git', ['push', '--set-upstream', 'origin', branch])
  const pull = api<{ number: number }>(`repos/${repository}/pulls`, 'POST', {
    base: 'main',
    head: branch,
    title: 'docs: refresh release screenshots',
    body: `Synthetic screenshots verified by Release run ${environment('GITHUB_RUN_ID')}.`,
  })

  // Labels do not need an additional issues permission on the App.
  command('gh', ['pr', 'edit', String(pull.number), '--repo', repository, '--add-label', 'skip-changelog'])
  command('gh', [
    'pr',
    'merge',
    String(pull.number),
    '--repo',
    repository,
    '--auto',
    '--squash',
    '--match-head-commit',
    head,
  ])
  await runCI(repository, branch, head, contexts, 'screenshots')
  const route = `repos/${repository}/pulls/${pull.number}`
  const current = api<ScreenshotPull>(route)

  assertScreenshotPull(current, { repository, base, head, branch, bot })
  assertScreenshotFiles(pages<{ filename: string; status: string }>(`${route}/files?per_page=100`))
  const checks = await waitFor('all screenshot head checks to finish', () => {
    const observed = pages<CheckRun>(`repos/${repository}/commits/${head}/check-runs?per_page=100`, 'check_runs')

    return observed.every((check) => check.status === 'completed') ? observed : undefined
  })

  assertChecks(checks, contexts)
  let merged = current.merge_commit_sha

  if (!current.merged) {
    assert.equal(mainSha(repository), base, 'Main changed while screenshot CI ran')
    const result = api<{ merged: boolean; sha: string }>(`${route}/merge`, 'PUT', { sha: head, merge_method: 'squash' })

    assert.ok(result.merged, 'Native merge rejected the screenshot PR')
    merged = result.sha
  }

  assert.ok(merged)
  assert.equal(mainSha(repository), merged, 'Main advanced beyond the verified screenshot merge')
  const commit = api<{ parents: { sha: string }[] }>(`repos/${repository}/git/commits/${merged}`)

  assert.deepEqual(
    commit.parents.map((parent) => parent.sha),
    [base],
    'Unexpected screenshot merge ancestry',
  )
  output('sha', merged)
  output('pr', String(pull.number))
}
