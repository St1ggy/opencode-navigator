import { createEffect, onCleanup, untrack } from 'solid-js'

import type { GuiSessionScope, createSelectedSessionAccess } from './selected-session'

const noop = () => {}

export function subscribeGuiAccountEvents(
  access: ReturnType<typeof createSelectedSessionAccess>,
  scope: GuiSessionScope,
  invalidate: (eager?: boolean) => void,
) {
  let stopped = false
  let cleanup = noop
  let previous: object | undefined

  createEffect(() => {
    if (stopped || !access.current(scope)) return

    const { data } = access.cache(scope)

    if (previous && previous !== data) untrack(() => invalidate())

    previous = data
    const events = [
      'credential.switched',
      'credential.updated',
      'integration.updated',
      'provider.updated',
      'server.connected',
    ] as const
    const subscriptions = events.map((event) =>
      data.on(event, (observation) => {
        if (stopped || !access.current(scope)) return

        const directory = observation?.location?.directory

        if (
          (event === 'provider.updated' || event === 'integration.updated') &&
          directory &&
          directory !== scope.target.directory
        )
          return

        untrack(() => invalidate(event !== 'provider.updated'))
      }),
    )

    cleanup = () => {
      for (const stop of subscriptions) stop()
    }
    onCleanup(cleanup)
  })

  return () => {
    stopped = true
    cleanup()
  }
}
