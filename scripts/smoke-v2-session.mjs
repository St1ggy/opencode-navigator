import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { once } from 'node:events'
import { createInterface } from 'node:readline'
import { setTimeout as delay } from 'node:timers/promises'

const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 35_000)
const password = randomBytes(24).toString('base64url')
const credentials = Buffer.from(`opencode:${password}`).toString('base64')
const authorization = `Basic ${credentials}`
const server = spawn(process.argv[2], ['serve', '--stdio', '--hostname', '127.0.0.1', '--port', '0'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: { ...process.env, OPENCODE_PASSWORD: password, OPENCODE_SERVER_PASSWORD: password },
})
const exited = once(server, 'close')
const lines = createInterface({ input: server.stdout })

async function request(url, path, content) {
  const response = await fetch(new URL(path, url), {
    method: 'POST',
    headers: { authorization, 'content-type': 'application/json' },
    body: JSON.stringify(content),
    signal: controller.signal,
  })
  const value = await response.json()

  return { response, value }
}

try {
  const [line] = await once(lines, 'line', { signal: controller.signal })
  const { url } = JSON.parse(line)

  assert.equal(new URL(url).hostname, '127.0.0.1')
  // 2.3 starts plugins asynchronously. Retrying an explicitly unavailable,
  // read-only capability in the same server proves activation, not just boot.
  for (;;) {
    const { response, value } = await request(url, '/api/rpc/opencode-navigator.quotas/capabilities', { input: {} })

    if (response.ok) {
      assert.ok(Array.isArray(value.output), 'The provider quota server did not initialize independently of Todo')
      break
    }

    assert.equal(value.type, 'rpc.unavailable', JSON.stringify(value))
    await delay(100, undefined, { signal: controller.signal })
  }

  const session = await request(url, '/api/session', { title: 'OpenCode Navigator 2.x smoke' })
  const id = session.value.data?.id ?? session.value.id

  assert.ok(session.response.ok && id, JSON.stringify(session.value))
  const todo = await request(url, '/api/rpc/opencode-navigator.todo/list', { input: { sessionID: id } })

  assert.ok(todo.response.ok && Array.isArray(todo.value.output?.todos), JSON.stringify(todo.value))
  assert.equal(todo.value.output.guidance, false)
  console.log(id)
} finally {
  clearTimeout(timeout)
  lines.close()
  server.stdin.end()
  const stop = setTimeout(() => server.kill('SIGTERM'), 5000)

  try {
    await exited
  } finally {
    clearTimeout(stop)
  }
}
