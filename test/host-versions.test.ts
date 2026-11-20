import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import metadata from '../package.json'
import { hostVersions } from '../scripts/host-versions.mjs'
import { requiredContexts } from '../scripts/release/guards'

test('package admits both stable host endpoints and rejects other major lines', () => {
  for (const [line, peer] of [
    ['v1', '@opencode-ai/plugin'],
    ['v2', '@opencode/plugin'],
  ] as const) {
    const { minimum, latest } = hostVersions(line)

    expect(metadata.devDependencies[peer]).toBe(metadata.peerDependencies[peer])
    for (const version of [minimum, latest]) {
      expect(Bun.semver.satisfies(version, metadata.engines.opencode)).toBe(true)
      expect(Bun.semver.satisfies(version, metadata.peerDependencies[peer])).toBe(true)
      expect(Bun.semver.satisfies(`${version}-beta.1`, metadata.engines.opencode)).toBe(false)
    }
    expect(Bun.semver.satisfies('0.0.0', metadata.peerDependencies[peer])).toBe(false)
    expect(Bun.semver.satisfies('3.0.0', metadata.peerDependencies[peer])).toBe(false)
  }
  expect(Bun.semver.satisfies('3.0.0', metadata.engines.opencode)).toBe(false)
})

test('the release ruleset names stay independent of SDK upgrades', () => {
  const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8')

  expect(requiredContexts()).toHaveLength(7)
  expect(workflow).toContain(`name: ${requiredContexts().find((context) => context.startsWith('OpenCode 1.x'))}`)
  expect(workflow).toContain(`name: ${requiredContexts().find((context) => context.startsWith('OpenCode 2.x'))}`)
})
