import { createEffect, onCleanup } from 'solid-js'

import { createCodeModeController } from '../../../features/code-mode/model'
import { createNativeCodeModeSource } from '../../native/code-mode-source'

import type { Lifecycle } from '../../../shared/lib/lifecycle'
import type { GuiSessionScope, createSelectedSessionAccess } from './selected-session'

const noop = () => {}

export function createGuiCodeMode(
  access: ReturnType<typeof createSelectedSessionAccess>,
  scope: GuiSessionScope,
  lifecycle: Lifecycle,
) {
  const target = { key: scope.target.sessionKey, sessionID: scope.target.sessionID, directory: scope.target.directory }
  const source = createNativeCodeModeSource(target, (requireConnection = true) => {
    const current = requireConnection ? access.read(scope) : access.cache(scope)

    return {
      client: current.client,
      data: access.cache(scope).data,
      current: () => access.current(scope) && current.current(),
    }
  })
  const subscribe = source.subscribe

  source.subscribe = (listener) => {
    let disposed = false
    let cleanup = noop

    createEffect(() => {
      if (disposed || !access.current(scope)) return

      const available = source.current()

      cleanup = subscribe(listener)
      onCleanup(cleanup)

      if (available) listener('configuration')
    })

    return () => {
      disposed = true
      cleanup()
    }
  }

  return createCodeModeController(source, target, lifecycle)
}
