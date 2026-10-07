import { createEffect, createMemo, on, onCleanup } from 'solid-js'

import { DEFAULT_LIMITS_REFRESH_MINUTES, parseLimitsRefreshMinutes } from '../shared/config'

import type { ProviderAccountSource, SelectedModel, createProviderLimitsController } from '../entities/provider-limit'

export type LimitsRefreshOptions = {
  controller: ReturnType<typeof createProviderLimitsController>
  accountSource?: ProviderAccountSource
  selectedModel?: () => SelectedModel | undefined
  refreshMinutes?: () => number
}

type Schedule = (callback: () => void, milliseconds: number) => () => void

const scheduleInterval: Schedule = (callback, milliseconds) => {
  const timer = setInterval(callback, milliseconds)

  return () => clearInterval(timer)
}

export function createLimitsRefresh(options: LimitsRefreshOptions, schedule: Schedule = scheduleInterval) {
  let disposed = false
  const selectedKey = createMemo(() => JSON.stringify(options.selectedModel?.()))
  const targetKey = createMemo(() => JSON.stringify(options.controller.current().model))
  const interval = createMemo(
    () => (parseLimitsRefreshMinutes(options.refreshMinutes?.()) ?? DEFAULT_LIMITS_REFRESH_MINUTES) * 60_000,
  )

  createEffect(
    on(selectedKey, () => {
      const model = options.selectedModel?.()

      if (model && options.accountSource) void options.accountSource.refresh(model).catch(() => {})
    }),
  )
  createEffect(
    on(targetKey, () => {
      const { model, adapter } = options.controller.current()

      if (model && adapter) void options.controller.refresh()
    }),
  )

  async function refresh() {
    if (disposed) return

    const target = targetKey()
    const model = options.selectedModel?.()

    if (model && options.accountSource) await options.accountSource.refresh(model)

    if (!disposed && target === targetKey()) await options.controller.refresh()
  }

  createEffect(
    on(interval, (milliseconds) => {
      onCleanup(schedule(() => void refresh().catch(() => {}), milliseconds))
    }),
  )
  onCleanup(() => {
    disposed = true
  })
}
