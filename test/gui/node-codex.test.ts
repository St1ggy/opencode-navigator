import { expect, test } from 'bun:test'

import { createNodeCodexClient } from '../../src/app/gui/adapters/node-codex'

const script = String.raw`
const lines = require('node:readline').createInterface({ input: process.stdin });
let initialized = false;
lines.on('line', line => {
  const request = JSON.parse(line);
  if (!request.id || request.method === 'hold') return;
  if (request.method === 'initialize') initialized = true;
  const response = request.method === 'unknown'
    ? { error: { code: -32601, message: 'Synthetic secret that must not escape' } }
    : { result: { initialized, synthetic: true } };
  process.stdout.write(JSON.stringify({ id: request.id, ...response }) + '\n');
});
`

test('Desktop Codex transport uses bounded stdio RPC without exposing provider error payloads', async () => {
  const client = createNodeCodexClient({ version: 'synthetic', command: ['node', '-e', script], timeoutMs: 1000 })

  try {
    expect(await client.request('account/read')).toEqual({ initialized: true, synthetic: true })
    await expect(client.request('unknown')).rejects.toThrow('Codex app-server method unavailable')
    const signal = new AbortController()
    const pending = client.request('hold', {}, signal.signal)

    signal.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(await client.request('account/read')).toEqual({ initialized: true, synthetic: true })
  } finally {
    client.dispose()
  }
  await expect(client.request('account/read')).rejects.toMatchObject({ name: 'AbortError' })
})

test('Desktop Codex transport rejects missing executables without leaking spawn details', async () => {
  const client = createNodeCodexClient({
    version: 'synthetic',
    command: ['/synthetic/not-installed/codex'],
    timeoutMs: 1000,
  })

  try {
    await expect(client.request('account/read')).rejects.toThrow(/Codex app-server (?:closed|write failed)/u)
  } finally {
    client.dispose()
  }
})
