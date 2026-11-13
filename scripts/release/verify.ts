import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { appendFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { api, environment, waitFor } from './github'
import { assertRun } from './guards'
import { assertProvenance } from './provenance'

import type { ProvenanceStatement } from './provenance'

type PublishRun = {
  id: number
  head_sha: string
  status: string
  conclusion: string | null
  event: string
  path: string
  head_branch: string
}

type Manifest = {
  name: string
  version: string
  dist: { integrity: string; tarball: string; attestations: { url: string } }
}

const repository = environment('GITHUB_REPOSITORY')
const sha = environment('RELEASE_SHA')
const { name, version } = JSON.parse(readFileSync('package.json', 'utf8')) as { name: string; version: string }
const tag = `v${version}`
// Resolve the executable installed by setup-node; never run a package-provided CLI.
const npm = Bun.which('npm')

assert.ok(npm)
const run = await waitFor('npm Publish', () => {
  const runs = api<{ workflow_runs: PublishRun[] }>(
    `repos/${repository}/actions/workflows/publish.yml/runs?event=release&head_sha=${sha}&per_page=100`,
  ).workflow_runs.filter((candidate) => candidate.head_branch === tag)

  return runs.find((candidate) => candidate.status === 'completed')
})

assertRun(run, sha, 'publish.yml', 'release')
const manifest = await waitFor(
  'registry availability (do not republish)',
  () => {
    const result = execFileSync(npm, ['view', `${name}@${version}`, '--json'], { encoding: 'utf8' })
    const candidate = JSON.parse(result) as Manifest

    assert.equal(candidate.name, name)
    assert.equal(candidate.version, version)

    return candidate
  },
  20,
)

async function fetchRegistry(url: string) {
  assert.equal(new URL(url).origin, 'https://registry.npmjs.org', 'Unexpected registry URL')
  const response = await fetch(url)

  assert.ok(response.ok, `Registry returned ${response.status}`)

  return response
}

const archiveResponse = await fetchRegistry(manifest.dist.tarball)
const archive = Buffer.from(await archiveResponse.arrayBuffer())
const sha512 = createHash('sha512').update(archive).digest('hex')

assert.equal(manifest.dist.integrity, `sha512-${Buffer.from(sha512, 'hex').toString('base64')}`)
const attestationResponse = await fetchRegistry(manifest.dist.attestations.url)
const attestations = (await attestationResponse.json()) as {
  attestations: { predicateType: string; bundle: { dsseEnvelope: { payload: string } } }[]
}
const provenance = attestations.attestations.find(
  (attestation) => attestation.predicateType === 'https://slsa.dev/provenance/v1',
)

assert.ok(provenance, 'No npm provenance')
assertProvenance(
  JSON.parse(Buffer.from(provenance.bundle.dsseEnvelope.payload, 'base64').toString()) as ProvenanceStatement,
  { version, sha, run: run.id, sha512, repository },
)
const directory = mkdtempSync(join(tmpdir(), 'navigator-registry-verification-'))

try {
  execFileSync(
    npm,
    ['install', '--ignore-scripts', '--legacy-peer-deps', '--no-audit', '--no-fund', `${name}@${version}`],
    { cwd: directory, stdio: 'inherit' },
  )
  execFileSync(npm, ['audit', 'signatures'], { cwd: directory, stdio: 'inherit' })
} finally {
  rmSync(directory, { recursive: true, force: true })
}

appendFileSync(
  environment('GITHUB_STEP_SUMMARY'),
  `Published and verified **${name}@${version}** from \`${sha}\`.\n\nRegistry integrity, signatures and exact Publish-run provenance verified.\n`,
)
