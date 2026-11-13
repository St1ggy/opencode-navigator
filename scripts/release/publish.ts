import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { api, command, environment, mainSha } from './github'

const repository = environment('GITHUB_REPOSITORY')
const sha = environment('RELEASE_SHA')
const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }
const tag = `v${version}`

assert.match(version, /^\d+\.\d+\.\d+$/u)
assert.match(sha, /^[a-f\d]{40}$/u)
assert.equal(mainSha(repository), sha, 'Main changed after final CI; do not publish a stale release')
assert.equal(command('git', ['rev-parse', 'HEAD']), sha)

if (command('git', ['tag', '--list', tag])) {
  assert.equal(command('git', ['rev-parse', `${tag}^0`]), sha, 'Existing tag points elsewhere')
  assert.equal(api<{ sha: string }>(`repos/${repository}/commits/${tag}`).sha, sha)
}

const releases = api<{ tag_name: string; draft: boolean; prerelease: boolean }[]>(
  `repos/${repository}/releases?per_page=100`,
)
const existing = releases.find((release) => release.tag_name === tag)

if (existing) {
  assert.ok(!existing.draft && !existing.prerelease, 'Existing release is not a final release')
  assert.equal(command('git', ['rev-parse', `${tag}^0`]), sha, 'Existing tag points elsewhere')
} else {
  const previous = releases.find((release) => !release.draft && !release.prerelease)

  assert.ok(previous, 'The first release needs a separate bootstrap')
  const generated = api<{ body: string }>(`repos/${repository}/releases/generate-notes`, 'POST', {
    tag_name: tag,
    target_commitish: sha,
    previous_tag_name: previous.tag_name,
  })
  const changelog = readFileSync('CHANGELOG.md', 'utf8')
  const start = changelog.indexOf(`## [${version}] - `)

  assert.ok(start !== -1, 'Missing shipped changelog heading')
  const section = changelog.slice(start).split('\n## [', 1)[0].split('\n').slice(1).join('\n').trim()
  const notes = [
    section && `## Highlights\n\n${section}`,
    '## Upgrade notes\n\nRestart OpenCode after updating Navigator. The existing Navigator Corners font requirement and Text fallback are unchanged.',
    generated.body,
  ]
    .filter(Boolean)
    .join('\n\n')

  assert.ok(!/[\u{0400}-\u{04FF}]|yandex-team\./u.test(notes), 'Release notes contain private/non-English content')
  assert.equal(mainSha(repository), sha, 'Main changed while generating release notes')

  if (!command('git', ['tag', '--list', tag])) {
    // Atomic creation fails on a conflicting tag; never force-update a tag.
    api(`repos/${repository}/git/refs`, 'POST', { ref: `refs/tags/${tag}`, sha })
  }

  assert.equal(api<{ sha: string }>(`repos/${repository}/commits/${tag}`).sha, sha)
  api(`repos/${repository}/releases`, 'POST', {
    tag_name: tag,
    target_commitish: sha,
    name: tag,
    body: notes,
    draft: false,
    prerelease: false,
  })
}
