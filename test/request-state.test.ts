import { expect, test } from 'bun:test'

import { createRequestState, retryBackgroundRefresh } from '../src/controllers/request-state'

test('a superseded failure cannot replace a newer successful request state', () => {
  const requests = createRequestState()
  const first = requests.start('target', 'load target', false)!
  const second = requests.start('target', 'load target', false, true)!

  expect(first.signal.aborted).toBe(true)
  second.succeed()
  second.finish()
  first.fail(new Error('late failure'))
  first.finish()

  expect(requests.state('target').status).toBe('ready')
  expect(requests.state('target').error).toBeUndefined()
  expect(requests.state('target').lastSuccessfulAt).toBeNumber()
})

test('an intentional abort restores the non-error state', () => {
  const requests = createRequestState()
  const request = requests.start('target', 'load target', false)!
  const error = new DOMException('Aborted', 'AbortError')

  request.fail(error)
  request.finish()

  expect(requests.state('target')).toEqual({ status: 'idle' })
})

test('abortAll invalidates tokens and settles loading state immediately', () => {
  const requests = createRequestState()
  const request = requests.start('old-worktree', 'load target', false)!

  requests.abortAll()

  expect(request.signal.aborted).toBe(true)
  expect(request.isCurrent()).toBe(false)
  expect(requests.state('old-worktree')).toEqual({ status: 'idle' })
  request.succeed()
  expect(requests.state('old-worktree')).toEqual({ status: 'idle' })
})

test('background refresh retries are bounded and can use a zero-delay waiter', async () => {
  let attempts = 0
  const delays: number[] = []

  const result = await retryBackgroundRefresh(
    async () => {
      attempts++

      if (attempts < 3) throw new TypeError('offline')

      return 'ready'
    },
    {
      delays: [10, 20],
      wait: async (delay) => {
        delays.push(delay)
      },
    },
  )

  expect(result).toBe('ready')
  expect(attempts).toBe(3)
  expect(delays).toEqual([10, 20])
})
