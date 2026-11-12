import { expect, test } from 'bun:test'

import { resetCreditView } from '../../src/features/provider-limits/model'

import type { BankedResetCredit } from '../../src/entities/provider-limit/model'

const credit: BankedResetCredit = {
  id: 'synthetic-credit',
  title: 'Synthetic reset',
  type: 'codexRateLimits',
  status: 'available',
  grantedAt: 100,
  expiresAt: 300,
}

test.each([
  ['available', 200, 'Available', true],
  ['available', 300, 'Expired', false],
  ['redeeming', 200, 'In progress', false],
  ['redeemed', 400, 'Used', false],
  ['unknown', 200, 'Status unknown', false],
] as const)('reset card preserves %s status and eligibility at %s', (status, seconds, label, canReview) => {
  expect(resetCreditView({ ...credit, status }, seconds * 1000)).toEqual({
    title: credit.title!,
    status: label,
    canReview,
  })
})

test('reset cards retain unavailable-date guidance without fabricating expiration or eligibility', () => {
  expect(resetCreditView({ ...credit, expiresAt: undefined }, 200_000).canReview).toBe(true)
  expect(resetCreditView({ ...credit, expiresAt: -1 }, 200_000).status).toBe('Available')
  expect(resetCreditView({ ...credit, type: 'unsupported-reset' }, 200_000).canReview).toBe(false)
  expect(resetCreditView({ ...credit, title: '' }, 200_000).title).toBe('Credit synthetic-credit')
})
