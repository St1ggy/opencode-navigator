import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { runCI } from './release/ci'
import { api, command, environment, mainSha, output } from './release/github'
import { assertPolicies, requiredContexts } from './release/guards'
import { mergeScreenshots } from './release/screenshots'

import type { PolicyAudit, Ruleset } from './release/guards'

const metadata = JSON.parse(readFileSync('package.json', 'utf8')) as {
  name: string
  version: string
  devDependencies: Record<string, string>
}
const repository = environment('GITHUB_REPOSITORY')
const contexts = requiredContexts({
  v1: metadata.devDependencies['@opencode-ai/plugin'],
  v2: metadata.devDependencies['@opencode/plugin'],
})
const sha = environment('RELEASE_SHA')

assert.equal(repository, 'St1ggy/opencode-navigator')
assert.match(sha, /^[a-f\d]{40}$/u)
assert.match(metadata.version, /^\d+\.\d+\.\d+$/u)
assert.equal(command('git', ['rev-parse', 'HEAD']), sha, 'Checkout does not match the release target')

switch (process.argv[2]) {
  case 'preflight': {
    assert.equal(environment('GITHUB_REF'), 'refs/heads/main', 'Release must be launched on main')
    assert.equal(mainSha(repository), sha)
    const appId = Number(environment('RELEASE_APP_ID'))

    assert.ok(Number.isSafeInteger(appId) && appId > 0)
    assertPolicies(
      api<Ruleset>(`repos/${repository}/rulesets/27108667`),
      api<Ruleset>(`repos/${repository}/rulesets/27109858`),
      contexts,
      appId,
      process.env.RELEASE_POLICY_AUDIT ? (JSON.parse(process.env.RELEASE_POLICY_AUDIT) as PolicyAudit) : undefined,
    )
    output('sha', sha)
    output('version', metadata.version)
    break
  }

  case 'ci': {
    assert.equal(mainSha(repository), sha, 'Main changed before CI')
    await runCI(repository, 'main', sha, contexts, environment('RELEASE_PHASE'))
    assert.equal(mainSha(repository), sha, 'Main changed during CI')
    output('sha', sha)
    break
  }

  case 'screenshots': {
    await mergeScreenshots(repository, sha, contexts)
    break
  }
  default: {
    throw new Error('Unknown release operation')
  }
}
