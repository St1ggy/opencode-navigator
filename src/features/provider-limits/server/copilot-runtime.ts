import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { QuotaReadError } from './native-http'
import { withinQuotaSignal } from './quota-deadline'

import type { CopilotClient } from '@github/copilot-sdk'
import type * as CopilotSDK from '@github/copilot-sdk'

type Runtime = {
  controller: AbortController
  client?: CopilotClient
  directory?: string
  startup?: Promise<CopilotClient>
}

export function createCopilotRuntime(load: () => Promise<typeof CopilotSDK>, timeoutMs: number) {
  let active: Runtime | undefined
  let disposed = false

  async function cleanup(runtime: Runtime) {
    const client = runtime.client
    const directory = runtime.directory

    runtime.client = undefined
    runtime.directory = undefined
    await withinQuotaSignal(AbortSignal.timeout(timeoutMs), async () => client?.forceStop()).catch(() => {})

    if (directory) await rm(directory, { recursive: true, force: true }).catch(() => {})
  }

  function discard(runtime: Runtime) {
    if (active === runtime) active = undefined

    runtime.controller.abort(new QuotaReadError(503, 'Copilot quota runtime stopped'))

    return cleanup(runtime)
  }

  async function start(runtime: Runtime) {
    const signal = AbortSignal.any([runtime.controller.signal, AbortSignal.timeout(timeoutMs)])

    try {
      return await withinQuotaSignal(signal, async () => {
        const sdk = await load()

        signal.throwIfAborted()
        const directory = await mkdtemp(join(tmpdir(), 'navigator-copilot-quotas-'))

        runtime.directory = directory

        if (signal.aborted) {
          await cleanup(runtime)
          signal.throwIfAborted()
        }

        const client = new sdk.CopilotClient({
          mode: 'empty',
          baseDirectory: directory,
          useLoggedInUser: false,
          logLevel: 'none',
          enableRemoteSessions: false,
        })

        runtime.client = client
        try {
          await client.start()
        } finally {
          // SDK startup can finish after forceStop, e.g. after a delayed artifact load.
          // Reclaim that late process using the captured client, not the new runtime.
          if (signal.aborted) {
            runtime.client = client
            runtime.directory = directory
            await cleanup(runtime)
          }
        }
        signal.throwIfAborted()

        return client
      })
    } catch {
      await discard(runtime)
      throw new QuotaReadError(503, 'The official Copilot SDK quota runtime is unavailable')
    }
  }

  return {
    async use<T>(signal: AbortSignal, work: (client: CopilotClient) => Promise<T>) {
      signal.throwIfAborted()

      if (disposed) throw new QuotaReadError(503, 'Copilot quota reader disposed')

      const runtime = (active ??= { controller: new AbortController() })
      const combined = AbortSignal.any([signal, runtime.controller.signal, AbortSignal.timeout(timeoutMs)])

      runtime.startup ??= start(runtime)

      try {
        return await withinQuotaSignal(combined, async () => {
          const client = await runtime.startup!

          combined.throwIfAborted()

          return work(client)
        })
      } catch (error) {
        void discard(runtime)
        throw error
      }
    },
    async dispose() {
      disposed = true

      if (active) await discard(active)
    },
  }
}
