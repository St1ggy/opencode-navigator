export function createCodexPeer(write: (message: unknown) => void, timeoutMs: number) {
  let sequence = 0
  const pending = new Map<number, { resolve(value: unknown): void; reject(error: Error): void; cleanup(): void }>()

  return {
    accept(line: string) {
      let value: { id?: unknown; result?: unknown; error?: { code?: number } }

      try {
        value = JSON.parse(line) as typeof value
      } catch {
        return
      }

      if (!value || typeof value.id !== 'number') return

      const request = pending.get(value.id)

      if (!request) return

      pending.delete(value.id)
      request.cleanup()

      if (value.error)
        request.reject(
          new Error(
            value.error.code === -32_601 ? 'Codex app-server method unavailable' : 'Codex app-server request failed',
          ),
        )
      else request.resolve(value.result)
    },
    request(method: string, params: unknown, signal?: AbortSignal) {
      signal?.throwIfAborted()

      return new Promise<unknown>((resolve, reject) => {
        const id = ++sequence
        const fail = (error: Error) => {
          const request = pending.get(id)

          if (!request) return

          pending.delete(id)
          request.cleanup()
          reject(error)
        }
        const abort = () => fail(new DOMException('Codex request cancelled', 'AbortError'))
        const timer = setTimeout(() => fail(new Error('Codex app-server timed out')), timeoutMs)

        pending.set(id, {
          resolve,
          reject,
          cleanup() {
            clearTimeout(timer)
            signal?.removeEventListener('abort', abort)
          },
        })
        signal?.addEventListener('abort', abort, { once: true })
        try {
          write({ id, method, params })
        } catch {
          fail(new Error('Codex app-server write failed'))
        }
      })
    },
    fail(error: Error) {
      for (const request of pending.values()) {
        request.cleanup()
        request.reject(error)
      }
      pending.clear()
    },
  }
}
