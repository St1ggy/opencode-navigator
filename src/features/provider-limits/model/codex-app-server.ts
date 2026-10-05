type Response = { id?: unknown; result?: unknown; error?: { code?: number } }
type Pending = {
  resolve(value: unknown): void
  reject(error: Error): void
  timer: ReturnType<typeof setTimeout>
  cleanup(): void
}

export function createCodexAppServerClient(input: {
  version: string
  command?: readonly string[]
  timeoutMs?: number
}) {
  const command = input.command ?? ['codex', 'app-server', '--stdio']
  const timeoutMs = input.timeoutMs ?? 10_000
  const pending = new Map<number, Pending>()
  let child: ReturnType<typeof Bun.spawn> | undefined
  let startup: Promise<void> | undefined
  let sequence = 0
  let disposed = false

  function failAll(error: Error) {
    for (const [id, request] of pending) {
      clearTimeout(request.timer)
      request.cleanup()
      request.reject(error)
      pending.delete(id)
    }
  }

  function write(message: unknown) {
    if (!child?.stdin || typeof child.stdin === 'number') throw new Error('Codex app-server is unavailable')

    child.stdin.write(`${JSON.stringify(message)}\n`)
  }

  function accept(line: string) {
    let message: Response

    try {
      message = JSON.parse(line) as Response
    } catch {
      return
    }

    if (typeof message.id !== 'number') return

    const request = pending.get(message.id)

    if (!request) return

    pending.delete(message.id)
    clearTimeout(request.timer)
    request.cleanup()

    if (message.error) {
      request.reject(
        new Error(
          message.error.code === -32_601 ? 'Codex app-server method unavailable' : 'Codex app-server request failed',
        ),
      )

      return
    }

    request.resolve(message.result)
  }

  function stop(process: ReturnType<typeof Bun.spawn>, error: Error) {
    if (child !== process) return

    child = undefined
    startup = undefined
    failAll(error)
    process.kill()
  }

  async function read(process: ReturnType<typeof Bun.spawn>) {
    const output = process.stdout

    if (!output || typeof output === 'number') return

    const decoder = new TextDecoder()
    const reader = output.getReader()
    let buffer = ''

    try {
      while (true) {
        const next = await reader.read()

        if (next.done) break

        buffer += decoder.decode(next.value, { stream: true })

        if (buffer.length > 1_000_000) throw new Error('Codex app-server response exceeds 1 MB')

        let end: number

        while ((end = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, end)

          buffer = buffer.slice(end + 1)

          if (line.length > 0) accept(line)
        }
      }
    } catch (error) {
      stop(process, error instanceof Error ? error : new Error('Codex app-server stream failed'))
    } finally {
      stop(process, new Error('Codex app-server closed'))
    }
  }

  function send(method: string, params: unknown, signal?: AbortSignal) {
    if (disposed) return Promise.reject(new DOMException('Codex app-server closed', 'AbortError'))

    if (!child) return Promise.reject(new Error('Codex app-server is unavailable'))

    return new Promise<unknown>((resolve, reject) => {
      const id = ++sequence
      const abort = () => {
        const request = pending.get(id)

        if (!request) return

        pending.delete(id)
        clearTimeout(request.timer)
        request.cleanup()
        reject(new DOMException('Codex request cancelled', 'AbortError'))
      }
      const timer = setTimeout(() => {
        pending.delete(id)
        signal?.removeEventListener('abort', abort)
        reject(new Error('Codex app-server timed out'))
      }, timeoutMs)

      if (signal?.aborted) {
        clearTimeout(timer)
        reject(new DOMException('Codex request cancelled', 'AbortError'))

        return
      }

      signal?.addEventListener('abort', abort, { once: true })
      pending.set(id, { resolve, reject, timer, cleanup: () => signal?.removeEventListener('abort', abort) })

      try {
        write({ id, method, params })
      } catch (error) {
        abort()
        reject(error)
      }
    })
  }

  async function initialize() {
    if (disposed) throw new Error('Codex app-server is unavailable')

    const process = Bun.spawn([...command], { stdin: 'pipe', stdout: 'pipe', stderr: 'ignore' })

    child = process
    void read(process)
    void process.exited.then(() => stop(process, new Error('Codex app-server closed')))
    try {
      await send('initialize', {
        clientInfo: { name: 'opencode-navigator', title: 'Navigator', version: input.version },
        capabilities: null,
      })
      write({ method: 'initialized' })
    } catch (error) {
      stop(process, error instanceof Error ? error : new Error('Codex initialization failed'))

      throw error
    }
  }

  return {
    async request<Result>(method: string, params: unknown = {}, signal?: AbortSignal) {
      if (disposed) throw new DOMException('Codex app-server closed', 'AbortError')

      const starting = (startup ??= initialize())

      try {
        await starting
      } catch (error) {
        if (startup === starting) startup = undefined

        throw error
      }

      return (await send(method, params, signal)) as Result
    },
    dispose() {
      disposed = true
      failAll(new DOMException('Codex app-server closed', 'AbortError'))
      child?.kill()
    },
  }
}

export type CodexAppServerClient = ReturnType<typeof createCodexAppServerClient>
