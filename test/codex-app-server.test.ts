import { expect, test } from 'bun:test'
import { join } from 'node:path'

import { createCodexAppServerClient } from '../src/features/provider-limits/model/codex-app-server'

function client(timeoutMs = 300) {
  return createCodexAppServerClient({
    command: [process.execPath, join(import.meta.dir, 'fixtures', 'codex-app-server.mjs')],
    version: 'test',
    timeoutMs,
  })
}

test('Codex app-server correlates concurrent responses, partial lines, and ignores notifications', async () => {
  const rpc = client()

  try {
    const first = rpc.request<{ value: string }>('test/delayed')
    const second = rpc.request<{ value: string }>('test/partial')

    expect(await second).toEqual({ value: 'partial' })
    expect(await first).toEqual({ value: 'delayed' })
    expect(await rpc.request<{ source: string }>('test/echo', { source: 'safe' })).toEqual({ source: 'safe' })
    await expect(rpc.request('test/unknown')).rejects.toThrow('method unavailable')
  } finally {
    rpc.dispose()
  }
})

test('Codex app-server bounds pending requests, aborts and disposes without retrying', async () => {
  const rpc = client(150)

  try {
    await expect(rpc.request('test/hang')).rejects.toThrow('timed out')
    const controller = new AbortController()
    const aborted = rpc.request('test/hang', {}, controller.signal)

    controller.abort()
    await expect(aborted).rejects.toMatchObject({ name: 'AbortError' })
    const pending = rpc.request('test/hang')

    rpc.dispose()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    await expect(rpc.request('test/echo')).rejects.toMatchObject({ name: 'AbortError' })
  } finally {
    rpc.dispose()
  }
})

test('Codex app-server can initialize again after an explicit retry of a failed launch', async () => {
  const command = ['navigator-synthetic-missing-codex-executable']
  const rpc = createCodexAppServerClient({ command, version: 'test', timeoutMs: 300 })

  try {
    await expect(rpc.request('test/echo')).rejects.toThrow()
    command.splice(0, command.length, process.execPath, join(import.meta.dir, 'fixtures', 'codex-app-server.mjs'))
    expect(await rpc.request<{ retried: boolean }>('test/echo', { retried: true })).toEqual({ retried: true })
  } finally {
    rpc.dispose()
  }
})
