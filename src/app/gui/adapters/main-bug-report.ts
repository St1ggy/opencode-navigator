import { randomUUID } from 'node:crypto'

import { createGitHubTransportWithRunner, validBugReport } from '../../../features/sidebar-settings/model'

import { runNodeCommand } from './node-command'

import type { BugReportDraft, BugReportResult } from '../../../features/sidebar-settings/model'

export function createMainBugReport(signal: AbortSignal, run = runNodeCommand) {
  const transport = createGitHubTransportWithRunner(async () => false, run)
  const drafts = new Map<number, { token: string; draft: BugReportDraft }>()
  const results = new Map<string, Promise<BugReportResult>>()

  return {
    probe(_input: void, caller: { signal: AbortSignal }) {
      return transport.probe(AbortSignal.any([signal, caller.signal]))
    },
    async prepare(draft: BugReportDraft, caller: { signal: AbortSignal; window: number }) {
      caller.signal.throwIfAborted()
      signal.throwIfAborted()

      if (!validBugReport(draft) || draft.title.length > 256 || draft.body.length > 60_000)
        throw new Error('A report title and body within the supported limits are required')

      const token = randomUUID()

      drafts.set(caller.window, { token, draft: { ...draft } })

      return token
    },
    async send(input: { token: string; draft: BugReportDraft }, caller: { signal: AbortSignal; window: number }) {
      const resultKey = `${caller.window}:${input.token}`
      const previous = results.get(resultKey)

      if (previous) return previous

      const prepared = drafts.get(caller.window)

      if (!prepared || prepared.token !== input.token || JSON.stringify(prepared.draft) !== JSON.stringify(input.draft))
        throw new Error('Report confirmation changed or expired. Review it again.')

      drafts.delete(caller.window)
      const currentSignal = AbortSignal.any([signal, caller.signal])
      const request = (async (): Promise<BugReportResult> => {
        const ready = await transport.probe(currentSignal)

        if (ready.status !== 'ready') return { status: 'failed', message: ready.message }

        return transport.send(prepared.draft, currentSignal)
      })()

      results.set(resultKey, request)

      // Retain bounded outcomes so duplicate IPC calls cannot send a second report.
      if (results.size > 100) results.delete(results.keys().next().value!)

      return request
    },
  }
}
