import type { Context, SessionRef } from '@opencode/plugin/gui'

const preceding = new WeakMap<Context, SessionRef>()

export function guiPreferenceSession(context: Context) {
  const session = context.sessions.current()

  if (session) {
    preceding.set(context, session)

    return session
  }

  // Settings is a host-owned route, not a mounted session. The public active
  // shell tab can still identify the preference scope without inventing a visit.
  if (!/^\/settings(?:[/?]|$)/.test(context.router.path())) {
    preceding.delete(context)

    return
  }

  const tabs = context.tabs.list()
  const active = tabs.find((tab) => tab.active)?.session

  if (active) return active

  const previous = preceding.get(context)
  const retained = tabs.find((tab) => tab.key === previous?.tab)?.session
  const valid =
    previous &&
    retained &&
    retained.id === previous.id &&
    retained.server.id === previous.server.id &&
    JSON.stringify(retained.location) === JSON.stringify(previous.location)

  if (!valid) preceding.delete(context)

  return valid ? retained : undefined
}
