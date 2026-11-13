import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { api, command } from './github'
import { assertPolicies, requiredContexts } from './guards'

import type { Ruleset } from './guards'

// Run once locally with the already authenticated owner, never from Actions.
// No owner token is read, serialized, printed or copied into the audit secret.
const repository = 'St1ggy/opencode-navigator'
const ci = api<Ruleset>(`repos/${repository}/rulesets/27108667`)
const review = api<Ruleset>(`repos/${repository}/rulesets/27109858`)
const appId = Number(command('gh', ['variable', 'get', 'RELEASE_APP_ID', '--repo', repository]))
const metadata = JSON.parse(readFileSync('package.json', 'utf8')) as { devDependencies: Record<string, string> }
const contexts = requiredContexts({
  v1: metadata.devDependencies['@opencode-ai/plugin'],
  v2: metadata.devDependencies['@opencode/plugin'],
})

assertPolicies(ci, review, contexts, appId)
assert.ok(
  Array.isArray(ci.bypass_actors) && Array.isArray(review.bypass_actors),
  'Owner-visible bypass data is required',
)
const audit = { version: 1, repository, appId, ci, review }

command('gh', ['secret', 'set', 'RELEASE_POLICY_AUDIT', '--repo', repository], JSON.stringify(audit))
console.log('Stored the verified ruleset revisions and bypass audit; owner credentials were not copied.')
