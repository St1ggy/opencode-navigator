export type CommandResult = { code: number; stdout: string; timedOut?: boolean }

export async function runProcessCommand(
  command: readonly string[],
  input = '',
  signal?: AbortSignal,
  timeoutMs = 15_000,
  environment?: Record<string, string | undefined>,
): Promise<CommandResult> {
  if (signal?.aborted) return { code: -1, stdout: '', timedOut: true }

  let child: Bun.Subprocess<'pipe', 'pipe', 'ignore'>

  try {
    child = Bun.spawn([...command], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'ignore',
      env: environment ? { ...process.env, ...environment } : undefined,
    })
  } catch {
    return { code: -1, stdout: '' }
  }

  child.stdin.write(input)
  child.stdin.end()
  let timer: ReturnType<typeof setTimeout> | undefined
  const chunks: Uint8Array[] = []
  const output = () => new TextDecoder().decode(Buffer.concat(chunks))
  let cancel!: () => void
  const cancelled = new Promise<CommandResult>((resolve) => {
    cancel = () => {
      try {
        child.kill('SIGKILL')
      } catch {
        // The process may already have exited.
      }
      resolve({ code: -1, stdout: output(), timedOut: true })
    }
    timer = setTimeout(cancel, timeoutMs)
    signal?.addEventListener('abort', cancel, { once: true })

    if (signal?.aborted) cancel()
  })
  const read = async () => {
    const reader = child.stdout.getReader()
    let size = 0

    try {
      while (true) {
        const part = await reader.read()

        if (part.done) break

        size += part.value.byteLength

        if (size > 65_536) {
          child.kill()
          throw new Error('Command output exceeded its limit')
        }

        chunks.push(part.value)
      }

      return { code: await child.exited, stdout: output() }
    } finally {
      reader.releaseLock()
    }
  }

  try {
    return await Promise.race([read(), cancelled])
  } catch {
    return { code: -1, stdout: '' }
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', cancel)
  }
}
