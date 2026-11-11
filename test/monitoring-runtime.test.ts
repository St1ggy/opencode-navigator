import { expect, test } from 'bun:test'

import { createProviderLimitsController } from '../src/entities/provider-limit/model'
import { createMonitoringRuntime } from '../src/pages/navigator/model'
import { createLeasePool } from '../src/shared/lib/lifecycle'
import { sessionTarget } from '../src/shared/lib/location/identity'

import type { SidebarTodo } from '../src/entities/todo/model'
import type { Cleanup } from '../src/shared/lib/lifecycle'

test('one page runtime coalesces monitoring requests across panel and mini-window leases', async () => {
  const target = sessionTarget({ serverID: 'synthetic-server', directory: '/synthetic/project', sessionID: 'parent' })!
  const calls: string[] = []
  const signals: AbortSignal[] = []
  let finishTodo!: (items: readonly SidebarTodo[]) => void
  let finishSubagents!: () => void
  let subscriptions = 0
  let unsubscribes = 0
  const pool = createLeasePool(() => {
    const abort = new AbortController()
    const cleanups: Cleanup[] = []
    const lifecycle = {
      signal: abort.signal,
      onDispose: (cleanup: Cleanup) => {
        cleanups.push(cleanup)
      },
    }
    const selected = () => ({ providerID: 'synthetic', modelID: 'model', sessionID: 'parent' })
    const limits = createProviderLimitsController(
      [
        {
          id: 'synthetic',
          name: 'Synthetic',
          supports: () => true,
          read: async (model) => {
            calls.push('limits')

            return {
              model,
              providerId: 'synthetic',
              providerName: 'Synthetic',
              availability: 'ready',
              fetchedAt: 100,
              windows: [],
            }
          },
        },
      ],
      selected,
      abort.signal,
    )

    cleanups.push(() => limits.dispose())
    const value = createMonitoringRuntime({
      lifecycle,
      target,
      limits: {
        controller: limits,
        selected,
        label: () => 'Synthetic model',
        chooseModel: () => {},
        chooseVariant: () => {},
      },
      todoHasValue: () => false,
      todo: {
        list: () => [],
        refresh: (_id, signal) => {
          calls.push('todo')
          signals.push(signal)

          return new Promise((resolve) => {
            finishTodo = resolve
          })
        },
      },
      subagents: {
        list: () => [],
        status: () => ({ type: 'idle' }),
        refresh: (_id, signal) => {
          calls.push('subagents')
          signals.push(signal)

          return new Promise((resolve) => {
            finishSubagents = resolve
          })
        },
      },
      subscribeSubagents: () => {
        subscriptions++

        return () => {
          unsubscribes++
        }
      },
      openSubagent: () => {},
    })

    return {
      value,
      dispose() {
        abort.abort()
        for (const cleanup of cleanups) void cleanup()
      },
    }
  })
  const panel = pool.acquire(target.sessionKey)
  const floating = pool.acquire(target.sessionKey)
  const first = panel.value.refresh()
  const second = floating.value.refresh()

  expect(panel.value).toBe(floating.value)
  expect(subscriptions).toBe(1)
  expect(calls).toEqual(['todo', 'subagents', 'limits'])
  panel.value.view.setTodoQuery('retained task query')
  panel.value.view.setTodoMode('finished')
  panel.value.view.setSubagentQuery('retained child query')
  panel.value.view.setSubagentMode('recent')
  panel.release()
  expect(floating.value.view.todoQuery()).toBe('retained task query')
  expect(floating.value.view.todoMode()).toBe('finished')
  expect(floating.value.view.subagentQuery()).toBe('retained child query')
  expect(floating.value.view.subagentMode()).toBe('recent')
  expect(signals.every((signal) => !signal.aborted)).toBe(true)
  floating.release()
  expect(signals.every((signal) => signal.aborted)).toBe(true)
  expect(unsubscribes).toBe(1)
  finishTodo([])
  finishSubagents()
  await Promise.all([first, second])
  expect(panel.value.todo.state('parent')).toEqual({ status: 'idle' })
  expect(panel.value.subagents.state('parent')).toEqual({ status: 'idle' })
  pool.dispose()
})
