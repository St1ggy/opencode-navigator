import { createEffect, createRoot, createSignal, getOwner, onCleanup, untrack } from 'solid-js'

import { createTodoSetupController } from '../../features/native-todo-setup/model'
import { type MonitoringRuntime, createCatalogRuntime, createMonitoringRuntime } from '../../pages/navigator/model'
import { createLeasePool } from '../../shared/lib/lifecycle'

import { createGuiCatalogSources } from './adapters/catalog-sources'
import { createGuiLimits } from './adapters/limits'
import { guiPreferenceScope } from './adapters/preference-scope'
import { createGuiQuickActions } from './adapters/quick-actions'
import { subscribeGuiReconnect } from './adapters/reconnect'
import { createGuiSettingsAccess } from './adapters/settings-access'
import { guiPreferenceSession } from './adapters/settings-session'
import { subscribeGuiSubagents } from './adapters/subagent-events'
import { createGuiSubagentSource } from './adapters/subagent-source'
import { createGuiTodoSetupSource } from './adapters/todo-setup-source'
import { createGuiTodoSource } from './adapters/todo-source'
import { createGuiNotifications } from './notifications'

import type { PreferencesController } from '../../entities/preferences/model'
import type { Cleanup } from '../../shared/lib/lifecycle'
import type { GuiSessionScope } from './adapters/selected-session'
import type { Context } from '@opencode/plugin/gui'

export function createMonitoringRegistry(context: Context, preferences: PreferencesController) {
  const access = createGuiSettingsAccess(context)
  const owner = getOwner()
  const scopes = new Map<string, GuiSessionScope>()
  const pool = createLeasePool((key) =>
    createRoot((dispose) => {
      const scope = scopes.get(key)!
      const abort = new AbortController()
      const cleanups: Cleanup[] = []
      const signal = AbortSignal.any([context.signal, abort.signal])
      const lifecycle = {
        signal,
        onDispose: (cleanup: Cleanup) => {
          cleanups.push(cleanup)
        },
      }
      const subagents = createGuiSubagentSource(access, scope)
      const sources = createGuiCatalogSources(access, scope)
      const catalogs = createCatalogRuntime({
        actions: createGuiQuickActions(context, access, scope),
        session: scope.target,
        lifecycle,
        preferences,
        ...sources,
        target: {
          key: scope.target.key,
          scope: guiPreferenceScope(guiPreferenceSession(context)),
          routing: { directory: scope.target.directory, workspace: scope.target.workspace },
        },
        notifications: createGuiNotifications(context),
        onReconnect: (listener) => subscribeGuiReconnect(access, scope, listener),
      })
      const todoSetup = createTodoSetupController({
        source: createGuiTodoSetupSource(access, scope),
        signal,
        route: () => (access.current(scope) ? scope.target.sessionKey : 'stale'),
        target(sessionID) {
          if (sessionID !== scope.target.sessionID) throw new DOMException('Todo session changed', 'AbortError')

          return {
            key: scope.target.sessionKey,
            sessionID,
            routing: { directory: scope.target.directory, workspace: scope.target.workspace },
          }
        },
      })
      const value = createMonitoringRuntime({
        lifecycle,
        target: scope.target,
        todo: createGuiTodoSource(access, scope),
        subagents,
        todoSetup,
        catalogs,
        limits: createGuiLimits(context, access, scope, signal, preferences),
        todoHasValue: () =>
          access.current(scope) && access.cache(scope).data.session.message.list(scope.target.sessionID).length > 0,
        subscribeSubagents: (listener) => subscribeGuiSubagents({ access, scope, source: subagents, listener }),
        openSubagent: (id) => {
          if (access.current(scope)) context.tabs.open({ server: scope.target.serverID, id }, { focus: true })
        },
      })
      let enabled = false

      createEffect(() => {
        if (!access.current(scope)) return

        const next = todoSetup.state(scope.target.sessionID).enabled === true

        if (next && !enabled) void value.todo.refresh(scope.target.sessionID).catch(() => {})

        enabled = next
      })
      void value.refresh()

      return {
        value,
        dispose() {
          abort.abort()
          try {
            for (const cleanup of cleanups) void cleanup()
          } finally {
            if (scopes.get(key) === scope) scopes.delete(key)

            dispose()
          }
        },
      }
    }, owner),
  )

  function acquire() {
    const scope = access.capture()

    if (!scope) return

    const key = scope.target.sessionKey

    if (scopes.get(key)?.visit !== scope.visit) pool.invalidate(key)

    scopes.set(key, scope)

    return pool.acquire(key)
  }

  const [active, setActive] = createSignal<MonitoringRuntime>()
  let held: ReturnType<typeof pool.acquire> | undefined
  let previous: GuiSessionScope | undefined

  // One window/session lease survives panel ↔ floating transitions. Views never
  // start their own monitoring or lose state while the host opens another placement.
  createEffect(() => {
    const scope = access.capture()

    if (scope?.target.sessionKey === previous?.target.sessionKey && scope?.visit === previous?.visit) return

    held?.release()
    previous = scope
    held = scope ? untrack(acquire) : undefined
    setActive(held?.value)
  })
  onCleanup(() => {
    held?.release()
    pool.dispose()
  })

  return { acquire, active, current: access.capture }
}

export type MonitoringRegistry = ReturnType<typeof createMonitoringRegistry>
