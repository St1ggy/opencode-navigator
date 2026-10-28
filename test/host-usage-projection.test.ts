import { expect, test } from 'bun:test'

import { normalizeProviderQuota, projectWorkspaceUsage } from '../src/entities/provider-limit'

import { hostUsage } from './fixtures/host-usage'

const model = { providerID: 'console', modelID: 'model', sessionID: 'session' }
const provider = { id: 'console', name: 'Console', integrationID: 'opencode' }

test('native workspace budgets keep USD, individual/shared semantics and precise model coverage', () => {
  const snapshot = normalizeProviderQuota(projectWorkspaceUsage(hostUsage, model, provider))

  expect(snapshot.accountId).toBeUndefined()
  expect(snapshot.workspaceId).toBe(hostUsage.workspace.id)
  expect(snapshot.windows.map((item) => [item.unit, item.total, item.used, item.remaining, item.scope])).toEqual([
    ['USD', 100, 30, 70, 'workspace'],
    ['USD', 20, 5, 15, 'workspace'],
  ])
  expect(snapshot.windows[0].budget).toEqual({ scope: 'combined', per: 'set', shared: true })
  expect(snapshot.windows[1].modelID).toBe('model')
  expect(projectWorkspaceUsage(hostUsage, { ...model, modelID: 'other-model' }, provider).windows).toHaveLength(1)
  expect(projectWorkspaceUsage(hostUsage, model, provider, [{ input: 0 }]).windows).toEqual([])
  expect(() => normalizeProviderQuota({ ...snapshot, workspaceId: undefined })).toThrow('does not match')
})

test('Go meters are used percent, not token counts or invented window durations', () => {
  const snapshot = normalizeProviderQuota(
    projectWorkspaceUsage(hostUsage, { ...model, providerID: 'opencode-go' }, { ...provider, id: 'opencode-go' }),
  )

  expect(snapshot.windows.map((item) => item.remaining)).toEqual([80, 0, 100])
  expect(snapshot.windows[1].limited).toBe(true)
  expect(snapshot.windows.every((item) => item.unit === '%' && item.durationMinutes === undefined)).toBe(true)
  expect(
    projectWorkspaceUsage(
      { ...hostUsage, go: undefined },
      { ...model, providerID: 'opencode-go' },
      { ...provider, id: 'opencode-go' },
    ).message,
  ).toContain('No Go allowance')
  expect(
    projectWorkspaceUsage({ ...hostUsage, budgets: [{ ...hostUsage.budgets[0], limit: 0, spent: 0 }] }, model, provider)
      .windows[0].remaining,
  ).toBe(0)
  expect(() => projectWorkspaceUsage(hostUsage, model, { ...provider, integrationID: 'other' })).toThrow(
    'active provider',
  )
})
