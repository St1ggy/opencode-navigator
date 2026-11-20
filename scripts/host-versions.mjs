import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const metadata = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const sdk = { v1: '@opencode-ai/plugin', v2: '@opencode/plugin' }

export function hostVersion(line, endpoint = 'latest') {
  assert.ok(['minimum', 'latest'].includes(endpoint), `Unknown compatibility endpoint: ${endpoint}`)

  return hostVersions(line)[endpoint]
}

export function hostVersions(line) {
  assert.ok(Object.hasOwn(sdk, line), `Unknown OpenCode host line: ${line}`)
  const name = sdk[line]
  const range = metadata.peerDependencies[name]
  const minimum = /^\^(\d+\.\d+\.\d+)$/u.exec(range)?.[1]
  const { version: latest } = JSON.parse(
    readFileSync(new URL(`../node_modules/${name}/package.json`, import.meta.url), 'utf8'),
  )

  assert.ok(minimum, `Expected one minimum-version peer range for ${name}`)
  assert.match(latest, new RegExp(String.raw`^${line.slice(1)}\.\d+\.\d+$`, 'u'))
  assert.equal(metadata.engines.opencode, [sdk.v1, sdk.v2].map((peer) => metadata.peerDependencies[peer]).join(' || '))

  return { minimum, latest }
}

if (import.meta.main) {
  console.log(hostVersion(process.argv[2], process.argv[3]))
}
