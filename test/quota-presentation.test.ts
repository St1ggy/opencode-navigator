import { expect, test } from 'bun:test'

import { quotaPresentation } from '../src/features/provider-limits/model/quota-presentation'

import type { QuotaWindow } from '../src/entities/provider-limit'

const window: QuotaWindow = {
  id: 'quota',
  label: 'Primary',
  scope: 'account',
  unit: '%',
  used: 35,
  durationMinutes: 300,
}

test('quota presentation shows remaining headroom without technical reset suffixes', () => {
  const value = quotaPresentation(window)

  expect(value.value).toBe('65% left')
  expect(value.ratio).toBeCloseTo(0.65)
  expect(value.reset).toBe('Reset time unknown')
  expect(window.scope).toBe('account')
  expect(window.durationMinutes).toBe(300)
})

test('quota presentation preserves explicit native remaining values and never invents a scale for missing totals', () => {
  const native = { ...window, unit: 'tokens', total: 1000, remaining: 80, used: 900 }

  expect(quotaPresentation(native)).toMatchObject({ value: '80 tokens left', ratio: 0.08 })
  expect(quotaPresentation({ ...native, total: undefined }).ratio).toBeUndefined()
  expect(quotaPresentation({ ...native, remaining: undefined, used: undefined })).toMatchObject({
    value: '1000 tokens capacity',
    ratio: undefined,
  })
  expect(quotaPresentation({ ...window, used: 105 })).toMatchObject({ value: '-5% left', ratio: 0 })
})
test('single reset label preserves explicit unknown dates and unknown periods in both display modes', () => {
  const now = 1_800_000_000_000
  const quota = {
    id: 'single-reset',
    label: 'Quota',
    unit: '%',
    remaining: 68,
    durationMinutes: 100,
    resetsAt: now / 1000 + 4620,
  }
  const view = quotaPresentation(quota, now)

  expect(view.compactValue).toBe('68%')
  expect(view.period.detail).toBe('77%')
  expect(view.canToggleReset).toBe(true)
  expect(view.relativeReset).toBe('Reset in 1h 17m')
  expect(view.absoluteReset).toStartWith('Resets ')
  expect(view.absoluteReset).not.toContain('Reset in')
  for (const resetsAt of [undefined, NaN, -1]) {
    const invalid = quotaPresentation({ ...quota, resetsAt }, now)

    expect(invalid.canToggleReset).toBe(false)
    expect(invalid.relativeReset).toContain(resetsAt === undefined ? 'Reset time unknown' : 'Reset date invalid')
    expect(invalid.absoluteReset).toContain('Period progress unknown')
  }
  const unknown = quotaPresentation({ ...quota, durationMinutes: undefined }, now)

  expect(unknown.relativeReset).toContain('Period duration unknown')
  expect(unknown.absoluteReset).toContain('Period duration unknown')
})
