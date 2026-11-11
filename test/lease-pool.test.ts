import { expect, test } from 'bun:test'

import { createLeasePool } from '../src/shared/lib/lifecycle'

test('invalidated leases cannot dispose a replacement session visit', () => {
  let generation = 0
  const disposed: number[] = []
  const pool = createLeasePool(() => {
    const value = ++generation

    return {
      value,
      dispose: () => {
        disposed.push(value)
      },
    }
  })
  const stale = pool.acquire('same-server-session')

  pool.invalidate('same-server-session')
  const current = pool.acquire('same-server-session')

  stale.release()
  expect(disposed).toEqual([1])
  expect(current.value).toBe(2)
  current.release()
  expect(disposed).toEqual([1, 2])
  pool.dispose()
})

test('panel, Search and floating leases share one resource until the last consumer closes', () => {
  let creates = 0
  let disposals = 0
  const pool = createLeasePool(() => ({
    value: { generation: ++creates },
    dispose: () => {
      disposals++
    },
  }))
  const panel = pool.acquire('server/session/location')
  const floating = pool.acquire('server/session/location')

  expect(panel.value).toBe(floating.value)
  panel.release()
  panel.release()
  expect(disposals).toBe(0)
  const search = pool.acquire('server/session/location')

  expect(search.value).toBe(floating.value)
  floating.release()
  search.release()
  expect(disposals).toBe(1)
  const next = pool.acquire('server/session/location')

  panel.release()
  expect(next.value.generation).toBe(2)
  expect(disposals).toBe(1)
  pool.dispose()
  next.release()
  expect(disposals).toBe(2)
  expect(() => pool.acquire('another')).toThrow('disposed')
})

test('different server/location keys never share resources, and failed cleanup does not skip another resource', () => {
  const disposed: string[] = []
  const pool = createLeasePool((key) => ({
    value: key,
    dispose() {
      disposed.push(key)

      if (key === 'server-a') throw new Error('Synthetic cleanup failure')
    },
  }))
  const first = pool.acquire('server-a')
  const remote = pool.acquire('server-b')

  expect(first.value).not.toBe(remote.value)
  expect(() => pool.dispose()).toThrow('Resource cleanup failed')
  expect(disposed).toEqual(['server-a', 'server-b'])
  pool.dispose()
})

test('disposing a window while its resource factory runs cannot publish a leaked resource', () => {
  let disposals = 0
  const pool = createLeasePool<string>(() => {
    pool.dispose()

    return {
      value: 'synthetic',
      dispose: () => {
        disposals++
      },
    }
  })

  expect(() => pool.acquire('session')).toThrow('disposed')
  expect(disposals).toBe(1)
})

test('independent app windows isolate mutable leases for identical selected targets and clean up separately', () => {
  const disposed: string[] = []
  const windowPool = (window: string) =>
    createLeasePool(() => ({
      value: { window, filter: '' },
      dispose: () => {
        disposed.push(window)
      },
    }))
  const firstWindow = windowPool('window-a')
  const secondWindow = windowPool('window-b')
  const first = firstWindow.acquire('server/session/location')
  const second = secondWindow.acquire('server/session/location')

  first.value.filter = 'private view state'
  expect(second.value.filter).toBe('')
  expect(first.value).not.toBe(second.value)
  firstWindow.dispose()
  expect(disposed).toEqual(['window-a'])
  expect(secondWindow.acquire('server/session/location').value).toBe(second.value)
  secondWindow.dispose()
  expect(disposed).toEqual(['window-a', 'window-b'])
})
