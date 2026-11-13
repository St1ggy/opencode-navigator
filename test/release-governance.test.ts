import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import metadata from '../package.json'
import {
  assertChecks,
  assertPolicies,
  assertRun,
  assertScreenshotFiles,
  assertScreenshotPull,
  requiredContexts,
} from '../scripts/release/guards'
import { assertProvenance } from '../scripts/release/provenance'

import type { Ruleset, ScreenshotPull, VisibleRuleset } from '../scripts/release/guards'

const contexts = requiredContexts({
  v1: metadata.devDependencies['@opencode-ai/plugin'],
  v2: metadata.devDependencies['@opencode/plugin'],
})
const success = contexts.map((name) => ({ name, app: { id: 15_368 }, status: 'completed', conclusion: 'success' }))

function policies() {
  const base = {
    id: 1,
    updated_at: '2026-01-01T03:00:00.000+03:00',
    enforcement: 'active',
    conditions: { ref_name: { include: ['refs/heads/main'], exclude: [] } },
  }
  const ci: VisibleRuleset = {
    ...base,
    bypass_actors: [],
    rules: [
      {
        type: 'required_status_checks',
        parameters: {
          strict_required_status_checks_policy: true,
          required_status_checks: contexts.map((context) => ({ context, integration_id: 15_368 })),
        },
      },
    ],
  }
  const review: VisibleRuleset = {
    ...structuredClone(base),
    id: 2,
    bypass_actors: [{ actor_id: 42, actor_type: 'Integration', bypass_mode: 'pull_request' }],
    rules: [
      { type: 'pull_request', parameters: { required_approving_review_count: 1, require_code_owner_review: true } },
    ],
  }

  return { ci, review }
}

test('restricted ruleset responses need a matching revision-bound owner audit, never an assumed empty bypass', () => {
  const { ci, review } = policies()
  const audit = {
    version: 1 as const,
    repository: 'St1ggy/opencode-navigator',
    appId: 42,
    ci: structuredClone(ci),
    review: structuredClone(review),
  }
  const restrictedCI = { ...ci, updated_at: '2026-01-01T00:00:00.000Z' }
  const restrictedReview = { ...review, updated_at: '2026-01-01T00:00:00.000Z' }

  delete (restrictedCI as any).bypass_actors
  delete (restrictedReview as any).bypass_actors
  expect(() => assertPolicies(restrictedCI, restrictedReview, contexts, 42)).toThrow()
  expect(() => assertPolicies(restrictedCI, restrictedReview, contexts, 42, audit)).not.toThrow()
  expect(() =>
    assertPolicies({ ...restrictedCI, updated_at: '2026-01-02T00:00:00Z' }, restrictedReview, contexts, 42, audit),
  ).toThrow('changed since')
  const changed = structuredClone(restrictedCI)

  changed.rules[0].parameters.strict_required_status_checks_policy = false
  expect(() => assertPolicies(changed, restrictedReview, contexts, 42, audit)).toThrow('changed since')
  expect(() => assertPolicies(restrictedCI, restrictedReview, contexts, 42, { ...audit, appId: 99 })).toThrow()
  const unsafe = structuredClone(audit)

  unsafe.ci.bypass_actors = review.bypass_actors
  expect(() => assertPolicies(restrictedCI, restrictedReview, contexts, 42, unsafe)).toThrow('never have bypass')
})

test('release App bypasses only ownership review while all seven native CI checks remain required', () => {
  const { ci, review } = policies()

  expect(() => assertPolicies(ci, review, contexts, 42)).not.toThrow()
  ci.bypass_actors = review.bypass_actors
  expect(() => assertPolicies(ci, review, contexts, 42)).toThrow('never have bypass')
  ci.bypass_actors = []
  review.bypass_actors[0].bypass_mode = 'always'
  expect(() => assertPolicies(ci, review, contexts, 42)).toThrow('owner-review')
  review.bypass_actors[0].bypass_mode = 'pull_request'
  expect(() => assertPolicies(ci, review, contexts, 99)).toThrow('owner-review')
})

test('release rejects weakened, wrong-integration, stale-base and inactive CI policies', () => {
  for (const mutate of [
    (ci: Ruleset) => {
      ci.enforcement = 'disabled'
    },
    (ci: Ruleset) => {
      ci.conditions.ref_name.exclude = ['refs/heads/main']
    },
    (ci: Ruleset) => {
      ci.rules[0].parameters.strict_required_status_checks_policy = false
    },
    (ci: Ruleset) => {
      ci.rules[0].parameters.required_status_checks!.pop()
    },
    (ci: Ruleset) => {
      ci.rules[0].parameters.required_status_checks![0].integration_id = 42
    },
  ]) {
    const { ci, review } = policies()

    mutate(ci)
    expect(() => assertPolicies(ci, review, contexts, 42)).toThrow()
  }
})

test('missing, skipped, failed, cancelled, pending or foreign checks cannot authorize screenshot merge', () => {
  expect(() => assertChecks(success, contexts)).not.toThrow()
  expect(() => assertChecks(success.slice(1), contexts)).toThrow('Missing')
  for (const conclusion of ['failure', 'cancelled', 'skipped', 'neutral', null]) {
    expect(() => assertChecks([{ ...success[0], conclusion }, ...success.slice(1)], contexts)).toThrow('not successful')
  }

  expect(() => assertChecks([{ ...success[0], status: 'in_progress' }, ...success.slice(1)], contexts)).toThrow()
  expect(() =>
    assertChecks(
      success.map((check) => ({ ...check, app: { id: 42 } })),
      contexts,
    ),
  ).toThrow('Missing')
})

const target = {
  repository: 'synthetic/navigator',
  base: 'base',
  head: 'head',
  branch: 'automation/screenshots',
  bot: 'release[bot]',
}

function screenshotPull(): ScreenshotPull {
  return {
    state: 'open',
    merged: false,
    merge_commit_sha: null,
    user: { login: target.bot, type: 'Bot' },
    head: { sha: target.head, ref: target.branch, repo: { full_name: target.repository } },
    base: { sha: target.base, ref: 'main', repo: { full_name: target.repository } },
  }
}

test('screenshot merge rejects foreign authors/repos and changed source/head identities', () => {
  expect(() => assertScreenshotPull(screenshotPull(), target)).not.toThrow()
  for (const mutate of [
    (pull: ScreenshotPull) => {
      pull.user.login = 'another[bot]'
    },
    (pull: ScreenshotPull) => {
      pull.user.type = 'User'
    },
    (pull: ScreenshotPull) => {
      pull.head.repo.full_name = 'foreign/navigator'
    },
    (pull: ScreenshotPull) => {
      pull.head.sha = 'new-head'
    },
    (pull: ScreenshotPull) => {
      pull.base.sha = 'new-base'
    },
    (pull: ScreenshotPull) => {
      pull.state = 'closed'
    },
  ]) {
    const pull = screenshotPull()

    mutate(pull)
    expect(() => assertScreenshotPull(pull, target)).toThrow()
  }
})

test('only added/modified PNGs in the two public screenshot directories can merge autonomously', () => {
  expect(() =>
    assertScreenshotFiles([
      { filename: 'screenshots/sidebar.png', status: 'modified' },
      { filename: 'screenshots/gui/limits.png', status: 'added' },
    ]),
  ).not.toThrow()
  expect(() => assertScreenshotFiles([])).toThrow('empty')
  for (const filename of [
    '.github/workflows/ci.yml',
    'screenshots/../source.png',
    'screenshots/gui/deep/file.png',
    'screenshots/file.svg',
  ]) {
    expect(() => assertScreenshotFiles([{ filename, status: 'modified' }])).toThrow()
  }

  for (const status of ['removed', 'renamed']) {
    expect(() => assertScreenshotFiles([{ filename: 'screenshots/file.png', status }])).toThrow()
  }
})

test('dispatched CI and npm Publish must complete successfully on the exact release commit', () => {
  const run = { head_sha: 'sha', event: 'workflow_dispatch', path: '.github/workflows/ci.yml', conclusion: 'success' }

  expect(() => assertRun(run, 'sha', 'ci.yml', 'workflow_dispatch')).not.toThrow()
  expect(() => assertRun(run, 'other', 'ci.yml', 'workflow_dispatch')).toThrow('different commit')
  expect(() => assertRun(run, 'sha', 'publish.yml', 'release')).toThrow()
  for (const conclusion of ['failure', 'cancelled', 'skipped', null]) {
    expect(() => assertRun({ ...run, conclusion }, 'sha', 'ci.yml', 'workflow_dispatch')).toThrow('did not succeed')
  }
})

test('registry provenance binds the package digest to the tag, commit and original npm Publish identity', () => {
  const expected = {
    version: '1.2.3',
    sha: 'source-sha',
    sha512: 'digest',
    run: 123,
    repository: 'synthetic/navigator',
  }
  const statement = {
    subject: [{ name: 'pkg:npm/opencode-navigator@1.2.3', digest: { sha512: 'digest' } }],
    predicate: {
      buildDefinition: {
        externalParameters: {
          workflow: {
            ref: 'refs/tags/v1.2.3',
            repository: 'https://github.com/synthetic/navigator',
            path: '.github/workflows/publish.yml',
          },
        },
        resolvedDependencies: [{ digest: { gitCommit: 'source-sha' } }],
      },
      runDetails: { metadata: { invocationId: 'https://github.com/synthetic/navigator/actions/runs/123/attempts/1' } },
    },
  }

  expect(() => assertProvenance(statement, expected)).not.toThrow()
  for (const changed of [
    { sha: 'other' },
    { sha512: 'other' },
    { run: 456 },
    { version: '1.2.4' },
    { repository: 'other/navigator' },
  ]) {
    expect(() => assertProvenance(statement, { ...expected, ...changed })).toThrow()
  }
})

test('single Release launch orders all stages without environments, reviews or owner credentials', () => {
  const source = readFileSync('.github/workflows/release.yml', 'utf8')
  const workflow = Bun.YAML.parse(source) as any

  expect(workflow.on).toHaveProperty('workflow_dispatch')
  expect(workflow.concurrency['cancel-in-progress']).toBe(false)
  expect(workflow.jobs['source-ci'].needs).toBe('preflight')
  expect(workflow.jobs.screenshots.needs).toEqual(['preflight', 'source-ci'])
  expect(workflow.jobs['final-ci'].needs).toBe('screenshots')
  expect(workflow.jobs.publish.needs).toEqual(['preflight', 'screenshots', 'final-ci'])
  expect(source).not.toContain('environment:')
  expect(source).not.toContain('OWNER_TOKEN')
  expect(source).not.toContain('gh pr review')
  expect(source).toContain('bun scripts/release/verify.ts')
  const prepare = readFileSync('.github/workflows/prepare-release.yml', 'utf8')

  expect(prepare).toContain('workflow_call:')
  expect(prepare).not.toContain('workflow_dispatch:')
  expect(prepare.indexOf('bun run screenshots:verify')).toBeLessThan(
    prepare.indexOf('actions/create-github-app-token@'),
  )
  expect(prepare).toContain('persist-credentials: false')
  const merge = readFileSync('scripts/release/screenshots.ts', 'utf8')

  expect(merge.indexOf("'--auto'")).toBeLessThan(merge.indexOf('await runCI('))
  expect(merge.indexOf('assertScreenshotFiles(pages')).toBeLessThan(merge.indexOf("'PUT'"))
  expect(merge).not.toContain('review')
})

test('all repository paths retain the sole designated code owner', () => {
  const rules = readFileSync('.github/CODEOWNERS', 'utf8')
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'))

  expect(rules).toEqual(['* @St1ggy'])
})

test('submitted reviews retain full read-only PR-associated CI without skipped required jobs', () => {
  const source = readFileSync('.github/workflows/ci.yml', 'utf8')

  expect(source).toContain('pull_request_review:\n    types: [submitted]')
  expect(source).not.toContain('github.event.review.state')
  expect(source).not.toContain('pull_request_target:')
  expect(source).toContain('permissions:\n  contents: read')
})
