import { expect, test } from 'bun:test'

import { createSubagentModel } from '../src/entities/subagent/model'
import { createTodoModel } from '../src/entities/todo/model'

import type { SidebarTodo } from '../src/entities/todo/model'

function lifecycle() {
  const controller = new AbortController()
  const cleanups: (() => void | Promise<void>)[] = []

  return {
    signal: controller.signal,
    onDispose: (cleanup: () => void | Promise<void>) => {
      cleanups.push(cleanup)
    },
    async dispose() {
      controller.abort()
      for (const cleanup of cleanups) await cleanup()
    },
  }
}

test('Todo consumers share a request until the final lease is released', async () => {
  const life = lifecycle()
  let signal!: AbortSignal
  let resolve!: (items: readonly SidebarTodo[]) => void
  let calls = 0
  const model = createTodoModel({
    lifecycle: life,
    target: (sessionID) => ({
      key: JSON.stringify(['server-a', sessionID]),
      sessionID,
      routing: { directory: '/synthetic' },
    }),
    cache: 'model',
    source: {
      list: () => [],
      refresh(_id, requestSignal) {
        calls++
        signal = requestSignal

        return new Promise((done) => {
          resolve = done
        })
      },
    },
  })

  try {
    const panel = model.activate('session')
    const floating = model.activate('session')
    const request = model.refresh('session')

    expect(model.refresh('session')).toBe(request)
    expect(calls).toBe(1)
    panel()
    panel()
    expect(signal.aborted).toBe(false)
    floating()
    expect(signal.aborted).toBe(true)
    resolve([{ content: 'Late', status: 'pending' }])
    expect(await request).toEqual([])
    expect(model.list('session')).toEqual([])
  } finally {
    await life.dispose()
  }
})

test('Todo stale lease cleanup cannot cancel a newly activated identical target', async () => {
  const life = lifecycle()
  const signals: AbortSignal[] = []
  const model = createTodoModel({
    lifecycle: life,
    target: (sessionID) => ({ key: sessionID, sessionID, routing: { directory: '/synthetic' } }),
    cache: 'model',
    source: {
      list: () => [],
      refresh: async (_id, signal) => {
        signals.push(signal)

        return []
      },
    },
  })

  try {
    const stale = model.activate('a')

    model.activate('b')
    const current = model.activate('a')
    const request = model.refresh('a')

    stale()
    expect(signals[0].aborted).toBe(false)
    await request
    current()
  } finally {
    await life.dispose()
  }
})

test('Todo synchronous source failures expose retryable request state', async () => {
  const life = lifecycle()
  let failed = true
  const model = createTodoModel({
    lifecycle: life,
    target: (sessionID) => ({ key: sessionID, sessionID, routing: { directory: '/synthetic' } }),
    cache: 'model',
    source: {
      list: () => [],
      refresh() {
        if (failed) throw new Error('Synthetic source failure')

        return Promise.resolve([])
      },
    },
  })

  try {
    await Promise.resolve(expect(model.refresh('a')).rejects.toThrow('Synthetic source failure'))
    expect(model.state('a').status).toBe('error')
    failed = false
    await model.retry('a')
    expect(model.state('a').status).toBe('ready')
  } finally {
    await life.dispose()
  }
})

test('Subagent consumers share activation without aborting another view', async () => {
  const life = lifecycle()
  let signal!: AbortSignal
  let resolve!: () => void
  let calls = 0
  const model = createSubagentModel({
    lifecycle: life,
    target: (parentID) => ({ key: parentID, parentID, routing: { directory: '/synthetic' } }),
    cache: 'source',
    source: { list: () => [], status: () => ({ type: 'idle' }), refresh: async () => {} },
    snapshot(_target, requestSignal) {
      calls++
      signal = requestSignal

      return new Promise((done) => {
        resolve = () => done({ sessions: [], statuses: {} })
      })
    },
    subscribe: () => () => {},
    open: () => {},
  })

  try {
    const panel = model.activate('parent')
    const search = model.activate('parent')
    const request = model.refresh('parent')
    const shared = model.refresh('parent')

    expect(calls).toBe(1)
    panel()
    expect(signal.aborted).toBe(false)
    search()
    expect(signal.aborted).toBe(true)
    resolve()
    await Promise.all([request, shared])
    expect(model.state('parent')).toEqual({ status: 'idle' })
  } finally {
    await life.dispose()
  }
})
