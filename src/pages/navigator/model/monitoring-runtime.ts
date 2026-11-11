import { createSubagentModel } from '../../../entities/subagent/model'
import { createTodoModel } from '../../../entities/todo/model'

import { createNavigatorSearch } from './search'
import { createMonitoringViewState } from './view-state'

import type { SubagentEvent, SubagentSource } from '../../../entities/subagent/model'
import type { TodoSource } from '../../../entities/todo/model'
import type { TodoSetupController } from '../../../features/native-todo-setup/model'
import type { Lifecycle } from '../../../shared/lib/lifecycle'
import type { SessionTarget } from '../../../shared/lib/location/identity'
import type { CatalogRuntime } from './catalog-runtime'
import type { LimitsMonitoring } from './limits-monitoring'

export type MonitoringPorts = {
  lifecycle: Lifecycle
  target: SessionTarget
  todo: TodoSource
  subagents: SubagentSource
  todoHasValue(): boolean
  todoSetup?: TodoSetupController
  limits?: LimitsMonitoring
  catalogs?: CatalogRuntime
  subscribeSubagents(listener: (event: SubagentEvent) => void): () => void
  openSubagent(sessionID: string): void
}

export function createMonitoringRuntime(ports: MonitoringPorts) {
  const { target, lifecycle } = ports
  const routing = { directory: target.directory, ...(target.workspace && { workspace: target.workspace }) }
  const todo = createTodoModel({
    lifecycle,
    target: (sessionID) => ({ key: target.sessionKey, sessionID, routing }),
    source: ports.todo,
    cache: 'source',
    hasValue: ports.todoHasValue,
  })
  const subagents = createSubagentModel({
    lifecycle,
    target: (parentID) => ({ key: target.sessionKey, parentID, routing }),
    source: ports.subagents,
    cache: 'source',
    async snapshot(current, signal) {
      await ports.subagents.refresh(current.parentID, signal)
      const sessions = ports.subagents.list(current.parentID)

      return {
        sessions,
        statuses: Object.fromEntries(sessions.map((session) => [session.id, ports.subagents.status(session.id)])),
      }
    },
    subscribe: ports.subscribeSubagents,
    open: ports.openSubagent,
  })

  lifecycle.onDispose(todo.activate(target.sessionID))
  lifecycle.onDispose(subagents.activate(target.sessionID))

  async function refreshTodo(force: boolean) {
    if (ports.todoSetup) {
      await ports.todoSetup.refresh(target.sessionID)

      if (ports.todoSetup.state(target.sessionID).enabled !== true) return
    }

    return todo.refresh(target.sessionID, force)
  }

  return {
    target,
    view: createMonitoringViewState(),
    todo,
    todoSetup: ports.todoSetup,
    limits: ports.limits,
    catalogs: ports.catalogs,
    search: ports.catalogs && createNavigatorSearch(ports.catalogs, subagents, target.sessionID),
    subagents,
    refresh: (force = false) =>
      Promise.allSettled([
        refreshTodo(force),
        subagents.refresh(target.sessionID, force),
        ports.limits?.controller.refresh(force),
        ports.catalogs?.refresh(force),
      ]),
  }
}

export type MonitoringRuntime = ReturnType<typeof createMonitoringRuntime>
