import { createEffect, onCleanup, untrack } from 'solid-js'

import type { createProviderLimitsController } from '../entities/provider-limit'

export function LimitsPersistence(props: { controller: ReturnType<typeof createProviderLimitsController> }) {
  createEffect(() => {
    const { model, adapter } = props.controller.current()

    if (model && adapter) untrack(() => void props.controller.refresh(true))
  })
  const timer = setInterval(() => void props.controller.refresh(), 5000)

  onCleanup(() => clearInterval(timer))

  return <box />
}
