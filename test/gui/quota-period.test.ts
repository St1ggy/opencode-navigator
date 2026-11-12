import { expect, spyOn, test } from 'bun:test'
import { createRoot } from 'solid-js'

import { createQuotaClock } from '../../src/features/provider-limits/model/quota-clock'
import { quotaPace, quotaPeriod } from '../../src/features/provider-limits/model/quota-period'

const now = 1_800_000_000_000
const window = { resetsAt: now / 1000 + 8100, durationMinutes: 10_000 / 60 }

test('time fraction uses the provider window rather than the time of observation', () => {
  expect(quotaPeriod(window, now)).toMatchObject({
    ratio: 0.81,
    active: true,
    countdown: 'Reset in 2h 15m',
    detail: '81%',
  })
  expect(quotaPeriod(window, now + 1_000_000).ratio).toBeCloseTo(0.71)
})

test.each([
  [0.9, 'normal'],
  [0.81, 'normal'],
  [0.8, 'yellow'],
  [0.74, 'yellow'],
  [0.66001, 'yellow'],
  [0.66, 'orange'],
  [0.52, 'orange'],
  [0.51, 'red'],
  [0, 'red'],
] as const)('quota remaining %s maps to %s at 81%% of the period remaining', (quota, pace) => {
  expect(quotaPace(quota, quotaPeriod(window, now))).toBe(pace)
})

test('missing or invalid dates/durations never produce fabricated time percentages or pace', () => {
  for (const input of [
    {},
    { durationMinutes: 60 },
    { resetsAt: NaN },
    { resetsAt: 0 },
    { resetsAt: Infinity },
    { ...window, durationMinutes: undefined },
    { ...window, durationMinutes: 0 },
    { ...window, durationMinutes: -1 },
    { ...window, durationMinutes: Infinity },
    { ...window, durationMinutes: 1 },
  ]) {
    const period = quotaPeriod(input, now)

    expect(period.ratio).toBeUndefined()
    expect(quotaPace(0, period)).toBe('normal')
  }
  expect(quotaPeriod({ resetsAt: window.resetsAt }, now).countdown).toBe('Reset in 2h 15m')
})

test('elapsed windows remain elapsed until a provider snapshot changes them', () => {
  const period = quotaPeriod(window, window.resetsAt * 1000 + 1)

  expect(period).toMatchObject({ ratio: 0, active: false, countdown: 'Reset due; refresh to verify' })
  expect(quotaPace(0, period)).toBe('normal')
  expect(quotaPace(undefined, quotaPeriod(window, now))).toBe('normal')
})

test('the presentation clock ticks locally and releases its timer with its owner', () => {
  let tick!: () => void
  const schedule = ((callback: () => void) => {
    tick = callback

    return 42
  }) as unknown as typeof globalThis.setInterval
  const interval = spyOn(globalThis, 'setInterval').mockImplementation(schedule)
  const clear = spyOn(globalThis, 'clearInterval').mockImplementation(() => {})
  const time = spyOn(Date, 'now').mockReturnValue(now)
  let dispose!: () => void

  try {
    const clock = createRoot((cleanup) => {
      dispose = cleanup

      return createQuotaClock()
    })

    expect(clock()).toBe(now)
    time.mockReturnValue(now + 30_000)
    tick()
    expect(clock()).toBe(now + 30_000)
    expect(interval).toHaveBeenCalledTimes(1)
    dispose()
    expect(clear).toHaveBeenCalledWith(42)
  } finally {
    dispose?.()
    interval.mockRestore()
    clear.mockRestore()
    time.mockRestore()
  }
})
