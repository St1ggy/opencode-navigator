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
