import { createMcpModel } from '../../../entities/mcp/model'
import { createSkillModel } from '../../../entities/skill/model'

import { createCatalogViews } from './catalog-views'

import type { McpMutation, McpSource, McpTarget } from '../../../entities/mcp/model'
import type { PreferencesController } from '../../../entities/preferences/model'
import type { QuickActionId, QuickActionSource } from '../../../entities/quick-action/model'
import type { SkillSource } from '../../../entities/skill/model'
import type { Lifecycle, Notifications } from '../../../shared/lib/lifecycle'
import type { SessionTarget } from '../../../shared/lib/location/identity'

export function createCatalogRuntime(ports: {
  target: McpTarget
  lifecycle: Lifecycle
  notifications: Notifications
  preferences: PreferencesController
  skills: SkillSource
  mcp: McpSource
  changeMcp: McpMutation
  actions: QuickActionSource
  session: SessionTarget
  onReconnect(listener: () => void): () => void
}) {
  const skills = createSkillModel({
    lifecycle: ports.lifecycle,
    target: () => ports.target,
    source: ports.skills,
    cache: 'source',
    onReconnect: ports.onReconnect,
  })
  const mcp = createMcpModel(
    {
      target: () => ports.target,
      source: ports.mcp,
      cache: 'source',
      change: ports.changeMcp,
      signal: ports.lifecycle.signal,
      notifications: ports.notifications,
    },
    ports.preferences.persistMcp,
    ports.preferences,
  )

  ports.lifecycle.onDispose(skills.activate())
  ports.lifecycle.onDispose(() => mcp.deactivate(ports.target))
  const connected = ports.onReconnect(() => {
    void mcp.activate(ports.target).catch(() => {})
  })

  ports.lifecycle.onDispose(connected)

  async function refresh(force = false) {
    await ports.preferences.load()

    if (ports.lifecycle.signal.aborted) return

    return Promise.allSettled([
      skills.refresh(ports.target, force),
      force ? mcp.refresh(ports.target, true) : mcp.activate(ports.target),
    ])
  }

  return {
    views: createCatalogViews({
      skills,
      mcp,
      preferences: ports.preferences,
      scope: ports.target.key,
      actionState: (id) => ports.actions.inspect(id, ports.session),
    }),
    skills,
    mcp,
    refresh,
    preferences: ports.preferences,
    actionState: (id: QuickActionId) => ports.actions.inspect(id, ports.session),
    async runAction(id: QuickActionId) {
      await ports.actions.execute(id, ports.session, ports.lifecycle.signal)
      await ports.preferences.recordQuickActionUse(id)
    },
  }
}

export type CatalogRuntime = ReturnType<typeof createCatalogRuntime>
