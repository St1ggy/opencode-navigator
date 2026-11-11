import { createMemo } from 'solid-js'

import { createReferenceSessionAccess } from './selected-session'
import { guiPreferenceSession } from './settings-session'

import type { Context } from '@opencode/plugin/gui'

export function createGuiSettingsAccess(context: Context) {
  let previousKey: string | undefined
  let visit: object | undefined
  const selected = createMemo(() => {
    const mounted = context.sessions.current()
    const reference = guiPreferenceSession(context)
    const key = reference && JSON.stringify([reference.server.id, reference.id, reference.location])

    if (!reference || !key) {
      previousKey = undefined
      visit = undefined

      return
    }

    if (mounted) visit = mounted.visit
    else if (previousKey !== key || !visit) visit = {}

    previousKey = key

    return { reference, visit }
  })

  return createReferenceSessionAccess(selected)
}
