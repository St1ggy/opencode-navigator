import { expect, test } from 'bun:test'

import { quotaBalanceValue } from '../src/features/provider-limits/model/balance-value'

test.each([
  ['1234.567800', '1234.57'],
  ['1', '1.00'],
  ['0.005', '0.01'],
  ['9.999', '10.00'],
  ['-0.004', '0.00'],
  ['-1.235', '-1.24'],
  ['9007199254740993.125', '9007199254740993.13'],
])('credit display rounds %s without losing source precision', (amount, expected) => {
  const balance = { id: 'credits', label: 'Credits', unit: 'credits', scope: 'account' as const, amount }

  expect(quotaBalanceValue(balance)).toBe(expected)
  expect(balance.amount).toBe(amount)
})

test('missing, unlimited and other native units retain distinct meanings', () => {
  expect(quotaBalanceValue({ id: 'credits', label: 'Credits', unit: 'credits', scope: 'account' })).toBe('Unavailable')
  expect(
    quotaBalanceValue({ id: 'credits', label: 'Credits', unit: 'credits', scope: 'account', unlimited: true }),
  ).toBe('Unlimited')
  expect(quotaBalanceValue({ id: 'usd', label: 'Balance', unit: 'USD', scope: 'account', amount: '1.2345' })).toBe(
    '1.2345 USD',
  )
})
