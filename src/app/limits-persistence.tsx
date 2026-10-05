import { createEffect, onCleanup, untrack } from 'solid-js'

import type { ProviderAccountSource, SelectedModel, createProviderLimitsController } from '../entities/provider-limit'

export function LimitsPersistence(props: {
  controller: ReturnType<typeof createProviderLimitsController>
  accountSource?: ProviderAccountSource
  selectedModel?: () => SelectedModel | undefined
}) {
  createEffect(() => {
    const model = props.selectedModel?.()

    if (model && props.accountSource) untrack(() => void props.accountSource!.refresh(model))
  })
  createEffect(() => {
    const { model, adapter } = props.controller.current()

    if (model && adapter) untrack(() => void props.controller.refresh(true))
  })
  const timer = setInterval(() => {
    const model = props.selectedModel?.()

    if (model && props.accountSource)
      void props.accountSource.refresh(model).then(() => untrack(() => props.controller.refresh()))
    else void props.controller.refresh()
  }, 5000)

  onCleanup(() => clearInterval(timer))

  return <box />
}
