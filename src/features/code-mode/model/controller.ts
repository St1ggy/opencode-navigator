import { createEffect, createMemo, createSignal, onCleanup } from 'solid-js'

import { patchRouting, routingState } from './routing'

import type { Lifecycle } from '../../../shared/lib/lifecycle'
import type { CodeModeSource, CodeModeTarget, RoutingEntry, RoutingPreview } from './types'

export function createCodeModeController(source: CodeModeSource, target: CodeModeTarget, lifecycle: Lifecycle) {
  const [entries, setEntries] = createSignal<RoutingEntry[]>([])
  const [error, setError] = createSignal<string>()
  const [busy, setBusy] = createSignal(false)
  const [revision, setRevision] = createSignal(0)
  const [now, setNow] = createSignal(Date.now())
  const [tab, setTab] = createSignal<'active' | 'recent'>()
  const [showAll, setShowAll] = createSignal(false)
  let refreshTask: Promise<void> | undefined
  let applying = false
  const valid = () => !lifecycle.signal.aborted && source.current()
  const runs = createMemo(() => {
    revision()

    return valid() ? source.runs() : []
  })
  const active = createMemo(() => runs().filter((run) => run.status === 'running' || run.status === 'streaming'))
  let clock: ReturnType<typeof setInterval> | undefined
  const stopClock = () => {
    clearInterval(clock)
    clock = undefined
  }

  createEffect(() => {
    if (active().length > 0 && !clock) clock = setInterval(() => setNow(Date.now()), 1000)
    else if (active().length === 0) stopClock()
  })
  lifecycle.onDispose(stopClock)
  onCleanup(stopClock)

  function assertCurrent() {
    if (!valid()) throw new Error('The selected server, session or location changed. Open a new preview.')
  }

  async function refresh() {
    if (!source.supported || !valid()) return

    if (refreshTask) return refreshTask

    const operation = (async () => {
      setBusy(true)
      try {
        const [, next] = await Promise.all([source.refresh(lifecycle.signal), source.entries(lifecycle.signal)])

        assertCurrent()
        setEntries(next)
        setError(undefined)
        setRevision((value) => value + 1)
      } catch (error_) {
        if (valid()) setError(error_ instanceof Error ? error_.message : String(error_))
      } finally {
        setBusy(false)
        refreshTask = undefined
      }
    })()

    refreshTask = operation

    return operation
  }

  lifecycle.onDispose(
    source.subscribe((kind) => {
      if (!valid()) {
        return
      }

      setRevision((value) => value + 1)

      if (kind === 'configuration') void refresh()
    }),
  )
  void refresh()

  return {
    supported: source.supported,
    reason: source.reason,
    target,
    current: valid,
    now,
    tab: () => tab() ?? (active().length > 0 || runs().length === 0 ? 'active' : 'recent'),
    setTab,
    showAll,
    toggleAll: () => setShowAll(!showAll()),
    runs,
    active,
    recent: createMemo(() => runs().filter((run) => run.status === 'completed' || run.status === 'error')),
    busy,
    error,
    refresh,
    routing: (server: string) => routingState(entries(), server),
    async preview(server: string, mode: 'code' | 'direct'): Promise<RoutingPreview> {
      assertCurrent()
      const connection = source.identity?.() ?? source
      const currentEntries = await source.entries(lifecycle.signal)
      const state = routingState(currentEntries, server)

      if (state.mode === 'unknown' || !state.source)
        throw new Error(state.reason ?? 'No editable configuration source.')

      const before = await source.read(state.source, lifecycle.signal)

      assertCurrent()

      if ((source.identity?.() ?? source) !== connection)
        throw new Error('The server connection changed. Preview again.')

      return { connection, target, server, mode, path: state.source, before, after: patchRouting(before, server, mode) }
    },
    async apply(preview: RoutingPreview) {
      assertCurrent()

      if (applying) throw new Error('A routing update is already in progress.')

      if (preview.target !== target) throw new Error('This preview belongs to another server or session.')

      if (preview.connection !== (source.identity?.() ?? source))
        throw new Error('The server connection changed. Preview again.')

      applying = true
      try {
        const state = routingState(await source.entries(lifecycle.signal), preview.server)

        if (state.source !== preview.path || state.mode === 'unknown')
          throw new Error('Configuration precedence changed. Preview again.')

        const before = await source.read(preview.path, lifecycle.signal)

        assertCurrent()

        if (preview.connection !== (source.identity?.() ?? source))
          throw new Error('The server connection changed. Preview again.')

        if (before !== preview.before || patchRouting(before, preview.server, preview.mode) !== preview.after)
          throw new Error('The configuration file changed. Preview again.')

        await source.write(preview.path, preview.after, lifecycle.signal)
        assertCurrent()

        if ((await source.read(preview.path, lifecycle.signal)) !== preview.after)
          throw new Error('Could not verify the saved routing configuration. Inspect it before retrying.')

        await refresh()
      } finally {
        applying = false
      }
    },
  }
}
