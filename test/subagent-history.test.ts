import { expect, test } from 'bun:test'

import { createSubagentHistory } from '../src/controllers/subagent-history'

test('history measures observed episodes and keeps only actual active-to-idle transitions', () => {
  let now = 100
  const history = createSubagentHistory({ now: () => now })

  history.observeStatus('a', 'child', { type: 'idle' })
  expect(history.recent('a')).toEqual([])
  now = 200
  history.observeStatus('a', 'child', { type: 'busy' })
  expect(history.active('a', 'child')).toMatchObject({ startedAt: 200, startedBeforeObservation: false })
  now = 400
  history.observeStatus('a', 'child', { type: 'retry', attempt: 1, next: 500, message: 'retry' })
  expect(history.active('a', 'child')?.startedAt).toBe(200)
  now = 600
  history.observeStatus('a', 'child', { type: 'idle' })
  history.observeStatus('a', 'child', { type: 'idle' })
  expect(history.recent('a')).toHaveLength(1)
  expect(history.recent('a')[0]).toMatchObject({ startedAt: 200, finishedAt: 600, outcome: 'finished' })
  history.observeStatus('b', 'child', { type: 'busy' })
  expect(history.active('b', 'child')?.startedBeforeObservation).toBe(true)
  now = 700
  history.observeStatus('a', 'child', { type: 'busy' })
  expect(history.recent('a')).toEqual([])
  expect(history.active('a', 'child')?.startedAt).toBe(700)
  expect(createSubagentHistory().recent('a')).toEqual([])
})

test('history prioritizes errors and cancellation, including late errors, and bounds recent', () => {
  let now = 0
  const history = createSubagentHistory({ now: () => now })

  for (let index = 0; index < 12; index++) {
    now++
    history.observeStatus('a', String(index), { type: 'busy' })
    now++
    history.observeStatus('a', String(index), { type: 'idle' })
  }
  expect(history.recent('a')).toHaveLength(10)
  expect(history.recent('a')[0].sessionID).toBe('11')
  history.observeError('a', '11', { name: 'UnknownError', data: { message: 'failed' } })
  expect(history.recent('a')[0]).toMatchObject({ outcome: 'error', errorMessage: 'failed' })
  history.observeStatus('a', '11', { type: 'busy' })
  history.observeError('a', undefined)
  history.observeError('a', '11')
  expect(history.active('a', '11')?.errorMessage).toBe('Session error')
  history.observeError('a', '11', { name: 'MessageAbortedError', data: { message: 'aborted' } })
  history.observeStatus('a', '11', { type: 'idle' })
  expect(history.recent('a').find((run) => run.sessionID === '11')?.outcome).toBe('cancelled')
  history.remove('a', '11')
  expect(history.recent('a').some((run) => run.sessionID === '11')).toBe(false)
})

test('native start upgrades observed timing without resetting retries or accepting older execution metadata', () => {
  const history = createSubagentHistory()

  history.observeStatus('a', 'child', { type: 'busy' }, 1000)
  history.observeStatus('a', 'child', { type: 'busy' }, 1100, 100)
  const run = history.active('a', 'child')

  expect(run).toMatchObject({ startedAt: 100, nativeStartedAt: 100, startedBeforeObservation: false })
  history.observeStatus('a', 'child', { type: 'retry', attempt: 1, next: 1500, message: 'retry' }, 1200, 100)
  expect(history.active('a', 'child')).toBe(run)
  history.observeError('a', 'child', { name: 'UnknownError', data: { message: 'old failure' } }, 1300)
  history.observeStatus('a', 'child', { type: 'busy' }, 2000, 1900)
  expect(history.active('a', 'child')).toEqual({
    sessionID: 'child',
    startedAt: 1900,
    nativeStartedAt: 1900,
    startedBeforeObservation: false,
  })
  const resumed = history.active('a', 'child')

  history.observeStatus('a', 'child', { type: 'busy' }, 2100, 100)
  expect(history.active('a', 'child')).toBe(resumed)
  history.observeStatus('a', 'child', { type: 'idle' }, 2200, 2100)
  expect(history.recent('a')[0]).toMatchObject({ startedAt: 1900, finishedAt: 2200, outcome: 'finished' })
  history.observeStatus('a', 'child', { type: 'busy' }, 2300, 2250)
  expect(history.active('a', 'child')?.startedAt).toBe(2250)
  expect(history.recent('a')).toEqual([])
})

test.each([undefined, 0, -1, NaN, Infinity, 1001])(
  'invalid native start %s retains the observation fallback',
  (native) => {
    const history = createSubagentHistory()

    history.observeStatus('a', 'child', { type: 'busy' }, 1000, native)
    expect(history.active('a', 'child')).toMatchObject({ startedAt: 1000, startedBeforeObservation: true })
    expect(history.active('a', 'child')?.nativeStartedAt).toBeUndefined()
    expect(history.active('b', 'child')).toBeUndefined()
  },
)
