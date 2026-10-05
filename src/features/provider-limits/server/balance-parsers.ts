import { balance, number, object, scaledAmount } from './native-values'

import type { ProviderQuotaSnapshot, QuotaBalance, SelectedModel } from '../../../entities/provider-limit'

export function balanceSnapshot(
  model: SelectedModel,
  providerName: string,
  values: readonly QuotaBalance[],
  fetchedAt = Date.now(),
  accountId?: string,
): ProviderQuotaSnapshot {
  return {
    model,
    providerId: model.providerID,
    providerName,
    fetchedAt,
    windows: [],
    balances: values,
    ...(accountId && { accountId }),
    availability: values.length > 0 ? 'ready' : 'unavailable',
    ...(values.length === 0 && {
      message: 'The provider did not report an available balance; it is not assumed to be zero.',
    }),
  }
}

export function deepSeekBalances(body: Record<string, unknown>) {
  return (Array.isArray(body.balance_infos) ? body.balance_infos : []).flatMap((raw, index) => {
    const row = object(raw)
    const unit = typeof row.currency === 'string' ? row.currency : undefined

    return [
      ...balance(`available-${index}`, 'Available balance', row.total_balance, unit),
      ...balance(`granted-${index}`, 'Granted balance', row.granted_balance, unit),
      ...balance(`topup-${index}`, 'Top-up balance', row.topped_up_balance, unit),
    ]
  })
}

export function moonshotBalances(body: Record<string, unknown>, currency: string) {
  const data = object(body.data)

  return body.code === 0 && body.status !== false
    ? [
        ...balance('available', 'Available balance', data.available_balance, currency),
        ...balance('voucher', 'Voucher balance', data.voucher_balance, currency),
        ...balance('cash', 'Cash balance', data.cash_balance, currency),
      ]
    : []
}

export function siliconFlowBalances(body: Record<string, unknown>) {
  const data = object(body.data)

  return body.status === false
    ? []
    : [
        ...balance('available', 'Available balance', data.totalBalance),
        ...balance('charged', 'Charged balance', data.chargeBalance),
        ...balance('granted', 'Granted balance', data.balance),
      ]
}

export function novitaBalances(body: Record<string, unknown>) {
  return [
    ['availableBalance', 'Available balance'],
    ['cashBalance', 'Cash balance'],
    ['creditLimit', 'Credit limit'],
    ['pendingCharges', 'Pending charges'],
    ['outstandingInvoices', 'Outstanding invoices'],
  ].flatMap(([field, label]) => balance(field, label, scaledAmount(body[field], 4), 'USD'))
}

export function miniMaxBalances(body: Record<string, unknown>) {
  const status = number(object(body.base_resp).status_code)

  if (status !== undefined && status !== 0) return []

  return [
    ['available_amount', 'Available balance'],
    ['cash_balance', 'Cash balance'],
    ['voucher_balance', 'Voucher balance'],
    ['credit_balance', 'Credit balance'],
    ['owed_amount', 'Owed amount'],
  ].flatMap(([field, label]) => balance(field, label, body[field]))
}

export function poeBalances(body: Record<string, unknown>) {
  return balance('points', 'Available plan and add-on points', body.current_point_balance, 'points')
}

export function nanoBalances(body: Record<string, unknown>) {
  return [
    ...balance('usd', 'Account balance', body.usd_balance, 'USD'),
    ...balance('nano', 'Balance in Nano', body.nano_balance, 'NANO'),
  ]
}

export function aiHubMixBalances(body: Record<string, unknown>) {
  return body.success === true
    ? balance('available', 'Available balance', scaledAmount(object(body.data).quota, 6, 2n), 'USD')
    : []
}

export function openRouterBudget(body: Record<string, unknown>) {
  const data = object(body.data)
  const remaining = number(data.limit_remaining)

  return data.limit === null
    ? [{ id: 'key-budget', label: 'Key spending budget', scope: 'key' as const, unlimited: true, unit: 'USD' }]
    : balance('key-budget', 'Remaining key spending budget', remaining, 'USD', 'key')
}
