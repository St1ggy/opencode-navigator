import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'

import type { Ruleset, VisibleRuleset } from './guards'

function revision(policy: Ruleset) {
  const updated = Date.parse(policy.updated_at)

  assert.ok(Number.isFinite(updated), 'Ruleset has no valid server revision')

  return { id: policy.id, updated, enforcement: policy.enforcement, conditions: policy.conditions, rules: policy.rules }
}

export function rulesetWithAudit(observed: Ruleset, audited?: VisibleRuleset): VisibleRuleset {
  if (audited) {
    assert.ok(
      isDeepStrictEqual(revision(observed), revision(audited)),
      'Ruleset changed since its owner audit; re-audit the intended policy before releasing',
    )

    if (observed.bypass_actors !== undefined) {
      assert.ok(
        isDeepStrictEqual(observed.bypass_actors, audited.bypass_actors),
        'Ruleset bypass actors differ from the owner audit',
      )
    }
  }

  const actors = observed.bypass_actors ?? audited?.bypass_actors

  // GitHub omits this field for callers without ruleset write access. Omission
  // is unknown, not an empty list; only a same-revision owner audit can fill it.
  assert.ok(Array.isArray(actors), 'Hidden bypass actors require a revision-bound owner policy audit')

  return { ...observed, bypass_actors: actors }
}
