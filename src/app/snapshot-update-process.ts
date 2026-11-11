import type { UpdateProgress } from '../entities/navigator-release/model'

const prefix = 'navigator-update-progress:'

function reportLine(line: string, report: (value: UpdateProgress) => void) {
  if (!line.startsWith(prefix) || line.length > 1024) return

  try {
    const data = JSON.parse(line.slice(prefix.length)) as { phase?: string }

    if (['preparing', 'downloading', 'installing', 'verifying'].includes(data.phase ?? ''))
      report({ phase: data.phase as UpdateProgress['phase'] })
  } catch {
    // Progress is optional; unrecognized subprocess output is not a stage.
  }
}

export async function runSnapshotUpdate(command: readonly string[], report: (value: UpdateProgress) => void) {
  const child = Bun.spawn([...command], { stdout: 'pipe', stderr: 'pipe' })
  const error = new Response(child.stderr).text()
  const reader = child.stdout.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const reading = (async () => {
    while (true) {
      const { done, value } = await reader.read()

      if (done) return

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')

      buffer = (lines.pop() ?? '').slice(-1024)
      for (const line of lines) reportLine(line, report)
    }
  })().catch(() => {})
  const exit = await child.exited

  await reader.cancel().catch(() => {})
  await reading

  const message = await error

  if (exit !== 0) throw new Error(message.trim() || `Snapshot installer failed (${exit})`)
}
