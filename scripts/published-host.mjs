import assert from 'node:assert/strict'

const packages = { v1: 'opencode-ai', v2: '@opencode/cli' }

export async function publishedHost(line, request = fetch) {
  assert.ok(Object.hasOwn(packages, line), `Unknown OpenCode host line: ${line}`)
  const response = await request(`https://registry.npmjs.org/${encodeURIComponent(packages[line])}/latest`, {
    signal: AbortSignal.timeout(10_000),
  })

  assert.ok(response.ok, `Could not resolve the published OpenCode ${line} CLI: HTTP ${response.status}`)
  const { version, dist } = await response.json()

  assert.match(version, new RegExp(String.raw`^${line.slice(1)}\.\d+\.\d+$`, 'u'))
  assert.match(dist?.integrity, /^sha512-[A-Za-z0-9+/]+=*$/u)

  return { version, integrity: dist.integrity }
}

if (import.meta.main) {
  const host = await publishedHost(process.argv[2])

  console.error(`Published OpenCode host ${host.version}, npm integrity ${host.integrity}`)
  console.log(host.version)
}
