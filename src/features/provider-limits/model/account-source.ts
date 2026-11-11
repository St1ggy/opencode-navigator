import { createSignal } from 'solid-js'

import type {
  HostProviderConnection,
  ProviderAccountSource,
  SelectedModel,
} from '../../../entities/provider-limit/model'

export function createProviderAccountSource(ports: {
  lifecycle: AbortSignal
  key(model: SelectedModel): string
  read(model: SelectedModel, signal: AbortSignal): Promise<HostProviderConnection>
  subscribe(invalidate: (eager?: boolean) => void): () => void
}): ProviderAccountSource {
  const [connections, setConnections] = createSignal<Record<string, HostProviderConnection>>({})
  let generation = 0
  let disposed = false
  let lastModel: SelectedModel | undefined
  let pending: { key: string; generation: number; promise: Promise<HostProviderConnection> } | undefined

  function save(target: string, connection: HostProviderConnection) {
    if (JSON.stringify(connections()[target]) !== JSON.stringify(connection))
      setConnections((values) => ({ ...values, [target]: connection }))
  }
  async function read(model: SelectedModel, signal = ports.lifecycle): Promise<HostProviderConnection> {
    if (disposed || ports.lifecycle.aborted || signal.aborted) return { status: 'unavailable' }

    const target = ports.key(model)
    const epoch = generation

    if (pending?.key === target && pending.generation === epoch) return pending.promise

    const promise = (async (): Promise<HostProviderConnection> => {
      try {
        const connection = await ports.read(model, AbortSignal.any([ports.lifecycle, signal]))

        if (
          disposed ||
          ports.lifecycle.aborted ||
          signal.aborted ||
          epoch !== generation ||
          ports.key(model) !== target
        )
          return { status: 'unavailable' }

        save(target, connection)

        return connection
      } catch {
        if (!disposed && !ports.lifecycle.aborted && !signal.aborted && epoch === generation)
          save(target, { status: 'unavailable' })

        return { status: 'unavailable' }
      }
    })()

    pending = { key: target, generation: epoch, promise }
    try {
      return await promise
    } finally {
      if (pending?.promise === promise) pending = undefined
    }
  }
  const unsubscribe = ports.subscribe((eager = true) => {
    generation++

    if (eager) setConnections({})
    else {
      const active = lastModel && ports.key(lastModel)

      setConnections((values) => Object.fromEntries(Object.entries(values).filter(([target]) => target === active)))
    }

    if (lastModel && !disposed) void read(lastModel)
  })

  return {
    suspend() {
      if (!lastModel) return

      lastModel = undefined
      generation++
      pending = undefined
    },
    current(model) {
      lastModel = model

      return { ...model, hostConnection: connections()[ports.key(model)] ?? { status: 'loading' } }
    },
    async refresh(model) {
      await read(model)
    },
    async validate(model, signal) {
      const actual = await read(model, signal)
      const expected = model.hostConnection

      return (
        actual.status === 'ready' &&
        expected?.status === 'ready' &&
        actual.id === expected.id &&
        actual.accountID === expected.accountID &&
        (!actual.accountID || actual.accountID === model.accountID)
      )
    },
    dispose() {
      disposed = true
      generation++
      unsubscribe()
    },
  }
}
