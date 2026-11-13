import assert from 'node:assert/strict'

export type ProvenanceStatement = {
  subject: { name: string; digest: { sha512: string } }[]
  predicate: {
    buildDefinition: {
      externalParameters: { workflow: { ref: string; repository: string; path: string } }
      resolvedDependencies: { digest: { gitCommit?: string } }[]
    }
    runDetails: { metadata: { invocationId: string } }
  }
}

// npm audit signatures verifies the cryptographic envelope; these checks additionally
// bind the signed claims to this exact release, source commit and Publish run.
export function assertProvenance(
  statement: ProvenanceStatement,
  expected: { version: string; sha: string; run: number; sha512: string; repository: string },
) {
  assert.ok(
    statement.subject.some(
      (subject) =>
        subject.name === `pkg:npm/opencode-navigator@${expected.version}` && subject.digest.sha512 === expected.sha512,
    ),
  )
  const definition = statement.predicate.buildDefinition

  assert.equal(definition.externalParameters.workflow.ref, `refs/tags/v${expected.version}`)
  assert.equal(definition.externalParameters.workflow.repository, `https://github.com/${expected.repository}`)
  assert.equal(definition.externalParameters.workflow.path, '.github/workflows/publish.yml')
  assert.ok(definition.resolvedDependencies.some((dependency) => dependency.digest.gitCommit === expected.sha))
  assert.ok(
    statement.predicate.runDetails.metadata.invocationId.startsWith(
      `https://github.com/${expected.repository}/actions/runs/${expected.run}/`,
    ),
  )
}
