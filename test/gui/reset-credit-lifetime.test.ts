import { expect, test } from 'bun:test'

import { resetCreditLifetime } from '../../src/entities/provider-limit/model'

test('credit expiry uses provider lifetime and current wall clock with clamped remaining progress', () => {
  const credit = { grantedAt: 1000, expiresAt: 8200 }

  expect(resetCreditLifetime(credit, 4_600_000)).toEqual({ label: 'Expires in 1 hour', remaining: 0.5, expired: false })
  expect(resetCreditLifetime(credit, 9_000_000)).toEqual({ label: 'Expired', remaining: 0, expired: true })
  expect(resetCreditLifetime(credit, 0).remaining).toBe(1)
  expect(resetCreditLifetime(credit, 8_199_000).label).toBe('Expires in less than a minute')
  expect(resetCreditLifetime(credit, 8_140_000).label).toBe('Expires in 1 minute')
  expect(resetCreditLifetime({ grantedAt: 1000, expiresAt: 173_800 }, 1_000_000).label).toBe('Expires in 2 days')
})

test('missing expiry and invalid lifetime never invent percentages or expiry', () => {
  expect(resetCreditLifetime({ grantedAt: 1000 }, 4_600_000)).toEqual({
    label: 'Expiry not supplied by the provider',
    remaining: undefined,
    expired: false,
  })
  expect(resetCreditLifetime({ grantedAt: 9000, expiresAt: 8200 }, 4_600_000).remaining).toBeUndefined()
  expect(resetCreditLifetime({ grantedAt: NaN, expiresAt: 8200 }, 4_600_000).remaining).toBeUndefined()
  expect(resetCreditLifetime({ grantedAt: 1000, expiresAt: Infinity }, 4_600_000).remaining).toBeUndefined()
})
