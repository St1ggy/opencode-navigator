import { createEffect, onCleanup } from 'solid-js'

import type { GuiSessionScope, createSelectedSessionAccess } from './selected-session'

const noop = () => {}

export function subscribeGuiReconnect(
  access: ReturnType<typeof createSelectedSessionAccess>,
  scope: GuiSessionScope,
  listener: () => void,
) {
  let stopped = false
  let previous: object | undefined
  let cleanup = noop

  createEffect(() => {
    if (stopped || !access.current(scope)) return

    const data = access.cache(scope).data

    if (previous && previous !== data) listener()

    previous = data
    cleanup = data.on('server.connected', () => {
      if (!stopped && access.current(scope)) listener()
    })
    onCleanup(cleanup)
  })

  return () => {
    stopped = true
    cleanup()
  }
}
