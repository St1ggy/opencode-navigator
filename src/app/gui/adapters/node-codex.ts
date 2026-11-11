import { spawn } from 'node:child_process'

import { createCodexPeer } from './codex-peer'

import type { CodexRpcClient } from '../../../features/provider-limits/model'
import type { ChildProcess } from 'node:child_process'

export function createNodeCodexClient(input: {
  version: string
  command?: readonly string[]
  timeoutMs?: number
}): CodexRpcClient {
  let child: ChildProcess | undefined
  let startup: Promise<void> | undefined
  let disposed = false
  let buffer = ''

  function write(value: unknown) {
    if (!child?.stdin || child.stdin.destroyed) throw new Error('Codex app-server unavailable')

    child.stdin.write(`${JSON.stringify(value)}\n`, (error) => {
      if (error) stop()
    })
  }
  const peer = createCodexPeer(write, input.timeoutMs ?? 10_000)

  function stop() {
    const previous = child

    child = undefined
    startup = undefined
    buffer = ''
    peer.fail(new Error('Codex app-server closed'))

    if (!previous) return

    previous.kill()
    const timer = setTimeout(() => {
      if (previous.exitCode === null && previous.signalCode === null) previous.kill('SIGKILL')
    }, 1000)

    timer.unref()
    previous.once('close', () => clearTimeout(timer))
  }
  async function start() {
    if (disposed) throw new DOMException('Codex app-server closed', 'AbortError')

    const command = input.command ?? ['codex', 'app-server', '--stdio']
    const process = spawn(command[0], command.slice(1), { stdio: ['pipe', 'pipe', 'ignore'], shell: false })

    child = process
    process.stdout?.setEncoding('utf8')
    process.stdout?.on('data', (chunk: string) => {
      if (child !== process) return

      buffer += chunk

      if (buffer.length > 1_000_000) {
        stop()

        return
      }

      let end = buffer.indexOf('\n')

      while (end !== -1) {
        const line = buffer.slice(0, end)

        buffer = buffer.slice(end + 1)
        peer.accept(line)
        end = buffer.indexOf('\n')
      }
    })
    const ended = () => {
      if (child === process) stop()
    }

    process.once('error', ended)
    process.once('close', ended)
    process.stdin?.on('error', ended)
    try {
      await peer.request('initialize', {
        clientInfo: { name: 'opencode-navigator', title: 'Navigator', version: input.version },
        capabilities: null,
      })
      write({ method: 'initialized' })
    } catch (error) {
      stop()
      throw error
    }
  }

  return {
    async request<Result>(method: string, params: unknown = {}, signal?: AbortSignal) {
      signal?.throwIfAborted()

      if (disposed) throw new DOMException('Codex app-server closed', 'AbortError')

      const ready = (startup ??= start())

      await ready
      signal?.throwIfAborted()

      return (await peer.request(method, params, signal)) as Result
    },
    dispose() {
      disposed = true
      stop()
    },
  }
}
