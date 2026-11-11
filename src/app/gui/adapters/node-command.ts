import { spawn } from 'node:child_process'

export function runNodeCommand(command: readonly string[], input = '', signal?: AbortSignal) {
  return new Promise<{ code: number; stdout: string; timedOut?: boolean }>((resolve) => {
    if (signal?.aborted) {
      resolve({ code: -1, stdout: '', timedOut: true })

      return
    }

    const child = spawn(command[0], command.slice(1), {
      shell: false,
      stdio: ['pipe', 'pipe', 'ignore'],
      env: { ...process.env, GH_PROMPT_DISABLED: '1', GH_HOST: 'github.com', GH_PAGER: 'cat' },
    })
    let stdout = ''
    let settled = false
    const finish = (code: number, timedOut = false) => {
      if (settled) return

      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', cancel)
      resolve({ code, stdout, ...(timedOut && { timedOut }) })
    }
    const cancel = () => {
      child.kill('SIGKILL')
      finish(-1, true)
    }
    const timer = setTimeout(cancel, 15_000)

    signal?.addEventListener('abort', cancel, { once: true })
    child.once('error', () => finish(-1))
    child.once('close', (code) => finish(code ?? -1))
    child.stdin.on('error', () => {
      child.kill('SIGKILL')
      finish(-1)
    })
    child.stdout.on('data', (value: Buffer) => {
      if (settled) return

      if (Buffer.byteLength(stdout) + value.byteLength > 65_536) {
        cancel()

        return
      }

      stdout += value.toString('utf8')
    })
    child.stdin.end(input)

    if (signal?.aborted) cancel()
  })
}
