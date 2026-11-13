import assert from 'node:assert/strict'

import { api, command, environment, output, pages, waitFor } from './github'
import { assertChecks, assertRun } from './guards'

type Run = {
  id: number
  head_sha: string
  status: string
  conclusion: string | null
  display_title: string
  event: string
  path: string
}

export async function runCI(repository: string, ref: string, sha: string, contexts: string[], phase: string) {
  assert.match(sha, /^[a-f\d]{40}$/u)
  const request = `release-${environment('GITHUB_RUN_ID')}-${environment('GITHUB_RUN_ATTEMPT')}-${phase}`

  command('gh', ['workflow', 'run', 'ci.yml', '--repo', repository, '--ref', ref, '-f', `release_request=${request}`])
  const id = await waitFor(
    'dispatched CI',
    () => {
      const runs = api<{ workflow_runs: Run[] }>(
        `repos/${repository}/actions/workflows/ci.yml/runs?event=workflow_dispatch&per_page=100`,
      ).workflow_runs.filter((run) => run.display_title === request)

      assert.ok(runs.length <= 1, 'Ambiguous release CI dispatch')

      return runs[0]?.id
    },
    5,
  )
  const run = await waitFor('CI completion', () => {
    const current = api<Run>(`repos/${repository}/actions/runs/${id}`)

    return current.status === 'completed' ? current : undefined
  })

  assertRun(run, sha, 'ci.yml', 'workflow_dispatch')
  const jobs = pages<{ name: string; status: string; conclusion: string | null }>(
    `repos/${repository}/actions/runs/${id}/jobs?per_page=100`,
    'jobs',
  )

  assertChecks(
    jobs.map((job) => ({ ...job, app: { id: 15_368 } })),
    contexts,
  )
  output('ci-run', String(id))

  return id
}
