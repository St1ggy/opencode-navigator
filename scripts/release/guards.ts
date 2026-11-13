import assert from 'node:assert/strict'

import { rulesetWithAudit } from './policy-audit'

export type CheckRun = {
  name: string
  status: string
  conclusion: string | null
  app?: { id: number }
}

export type Ruleset = {
  id: number
  updated_at: string
  enforcement: string
  conditions: { ref_name: { include: string[]; exclude: string[] } }
  bypass_actors?: { actor_id: number; actor_type: string; bypass_mode: string }[]
  rules: {
    type: string
    parameters: {
      strict_required_status_checks_policy?: boolean
      required_status_checks?: { context: string; integration_id: number }[]
      required_approving_review_count?: number
      require_code_owner_review?: boolean
    }
  }[]
}

export type VisibleRuleset = Ruleset & { bypass_actors: NonNullable<Ruleset['bypass_actors']> }

export type PolicyAudit = {
  version: 1
  repository: string
  appId: number
  ci: VisibleRuleset
  review: VisibleRuleset
}

export type ScreenshotPull = {
  state: string
  merged: boolean
  merge_commit_sha: string | null
  user: { login: string; type: string }
  head: { sha: string; ref: string; repo: { full_name: string } }
  base: { sha: string; ref: string; repo: { full_name: string } }
}

export function requiredContexts(versions: { v1: string; v2: string }) {
  return [
    'check',
    `OpenCode 1.x (${versions.v1})`,
    `OpenCode 2.x (${versions.v2})`,
    'Headless boundaries and lifecycle contracts',
    'corner-font',
    'Packaged Desktop (normal)',
    'Packaged Desktop (quota)',
  ]
}

export function assertPolicies(
  observedCI: Ruleset,
  observedReview: Ruleset,
  contexts: string[],
  appId: number,
  audit?: PolicyAudit,
) {
  if (audit) {
    assert.equal(audit.version, 1)
    assert.equal(audit.repository, 'St1ggy/opencode-navigator')
    assert.equal(audit.appId, appId)
  }

  const ci = rulesetWithAudit(observedCI, audit?.ci)
  const review = rulesetWithAudit(observedReview, audit?.review)

  for (const ruleset of [ci, review]) {
    assert.equal(ruleset.enforcement, 'active')
    assert.deepEqual(ruleset.conditions.ref_name, { include: ['refs/heads/main'], exclude: [] })
  }

  assert.deepEqual(ci.bypass_actors, [], 'Required CI must never have bypass actors')
  const required = ci.rules.find((rule) => rule.type === 'required_status_checks')?.parameters

  assert.equal(required?.strict_required_status_checks_policy, true)
  assert.deepEqual(required.required_status_checks?.map((check) => check.context).sort(), [...contexts].sort())
  assert.ok(required.required_status_checks.every((check) => check.integration_id === 15_368))
  const approvals = review.rules.find((rule) => rule.type === 'pull_request')?.parameters

  assert.equal(approvals?.require_code_owner_review, true)
  assert.equal(approvals.required_approving_review_count, 1)
  assert.ok(
    review.bypass_actors.some(
      (actor) => actor.actor_type === 'Integration' && actor.actor_id === appId && actor.bypass_mode === 'pull_request',
    ),
    'Install the release App and add it only to the owner-review ruleset',
  )
}

export function assertChecks(checks: CheckRun[], contexts: string[]) {
  for (const context of contexts) {
    const matching = checks.filter((check) => check.name === context && check.app?.id === 15_368)

    assert.ok(matching.length > 0, `Missing GitHub Actions check: ${context}`)
    assert.ok(
      matching.every((check) => check.status === 'completed' && check.conclusion === 'success'),
      `Required check is not successful: ${context}`,
    )
  }
}

export function assertScreenshotPull(
  pull: ScreenshotPull,
  expected: { repository: string; base: string; head: string; branch: string; bot: string },
) {
  assert.equal(pull.user.type, 'Bot')
  assert.equal(pull.user.login, expected.bot)
  assert.equal(pull.base.repo.full_name, expected.repository)
  assert.equal(pull.head.repo.full_name, expected.repository)
  assert.equal(pull.base.ref, 'main')
  assert.equal(pull.base.sha, expected.base, 'Screenshot PR base changed; start a new release')
  assert.equal(pull.head.ref, expected.branch)
  assert.equal(pull.head.sha, expected.head, 'Screenshot PR head changed')
  assert.ok(pull.state === 'open' || pull.merged, 'Screenshot PR was closed without merging')
}

export function assertScreenshotFiles(files: { filename: string; status: string }[]) {
  assert.ok(files.length > 0, 'Screenshot PR is empty')
  for (const file of files) {
    assert.match(file.filename, /^screenshots\/(?:gui\/)?[^/]+\.png$/u)
    assert.ok(['added', 'modified'].includes(file.status), 'Screenshot removal or rename needs a separate reviewed PR')
  }
}

export function assertRun(
  run: { head_sha: string; conclusion: string | null; event: string; path: string },
  sha: string,
  workflow: string,
  event: string,
) {
  assert.equal(run.head_sha, sha, 'Workflow ran a different commit')
  assert.equal(run.path, `.github/workflows/${workflow}`)
  assert.equal(run.event, event)
  assert.equal(run.conclusion, 'success', 'Workflow did not succeed; no merge or publication is allowed')
}
