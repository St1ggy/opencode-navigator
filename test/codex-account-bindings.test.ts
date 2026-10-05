import { expect, test } from 'bun:test'

import { bindCodexAccount } from '../src/app/limits-account-model'
import {
  applyPreferencesUpdate,
  createPreferencesController,
  parsePreferencesDocument,
} from '../src/entities/preferences'
import { pluginConfig } from '../src/shared/config'

import type { PreferencesDocument } from '../src/entities/preferences'
import type { SelectedModel } from '../src/entities/provider-limit'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

async function preferences(user: PreferencesDocument['user'] = {}) {
  let saved = parsePreferencesDocument({ user })
  const api = { state: { path: {} }, ui: { toast() {} } } as unknown as TuiPluginApi
  const controller = createPreferencesController(api, pluginConfig(undefined), {
    load: async () => saved,
    update: async (update) => {
      saved = applyPreferencesUpdate(saved, update)
    },
    flush: async () => {},
  })

  await controller.load()

  return { controller, saved: () => saved }
}

test('one provider binding serves every model, project and session without discarding a pending reset', async () => {
  const pending = {
    providerID: 'openai',
    modelID: 'old-model',
    accountID: 'account-a',
    idempotencyKey: 'd260630a-b6c5-41b6-a2ac-aee9bdbe720a',
    createdAt: 1,
  }
  const { controller, saved } = await preferences({
    codexAccountBindings: { '["openai","old-model"]': 'account-a', '["openai","other-model"]': 'account-a' },
    pendingResetAttempt: pending,
  })

  for (const modelID of ['old-model', 'other-model', 'new-model'])
    expect(controller.codexAccountForConnection('openai', undefined, modelID)).toBe('account-a')
  controller.toggleFavoriteMcpServer('synthetic-server')
  await controller.flush()
  expect(saved().user.pendingResetAttempt).toEqual(pending)
  expect(saved().user.codexAccountBindings?.['["openai","old-model"]']).toBe('account-a')
})

test('conflicting legacy model bindings stay isolated until a deliberate provider relink', async () => {
  const { controller, saved } = await preferences({
    codexAccountBindings: { '["openai","first"]': 'account-a', '["openai","second"]': 'account-b' },
  })

  expect(controller.codexAccountForConnection('openai', undefined, 'first')).toBe('account-a')
  expect(controller.codexAccountForConnection('openai', undefined, 'second')).toBe('account-b')
  expect(controller.codexAccountForConnection('openai', undefined, 'third')).toBeUndefined()
  controller.setCodexConnectionBinding('openai', undefined, 'chosen-account')
  await controller.flush()
  expect(controller.codexAccountForConnection('openai', undefined, 'third')).toBe('chosen-account')
  expect(saved().user.codexAccountBindings?.['["openai","first"]']).toBeUndefined()
  controller.setCodexConnectionBinding('openai', undefined)
  expect(controller.codexAccountForConnection('openai', undefined, 'first')).toBeUndefined()
})

test('connection bindings never fall back to another connection or a provider-wide legacy confirmation', async () => {
  const { controller, saved } = await preferences({ codexAccountBindings: { '["openai","first"]': 'legacy-account' } })

  controller.setCodexConnectionBinding('openai', 'credential:one', 'account-a')
  controller.setCodexConnectionBinding('openai', 'credential:two', 'account-b')
  await controller.flush()
  expect(controller.codexAccountForConnection('openai', 'credential:one', 'new-model')).toBe('account-a')
  expect(controller.codexAccountForConnection('openai', 'credential:two', 'new-model')).toBe('account-b')
  expect(controller.codexAccountForConnection('openai', 'credential:three', 'first')).toBeUndefined()
  const updated = applyPreferencesUpdate(saved(), {
    user: { favoriteMcpServer: { name: 'unrelated', favorite: true } },
  })

  expect(updated.user.codexAccountBindings).toEqual(saved().user.codexAccountBindings)
})

test('host identity wins over private bindings, and unavailable host metadata blocks provider fallback', async () => {
  const { controller } = await preferences()

  controller.setCodexConnectionBinding('openai', undefined, 'provider-account')
  controller.setCodexConnectionBinding('openai', 'credential:one', 'old-connection-account')
  const model: SelectedModel = {
    providerID: 'openai',
    modelID: 'synthetic-model',
    sessionID: 'session',
    hostConnection: { status: 'ready', id: 'credential:one', accountID: 'host-account' },
  }

  expect(bindCodexAccount(model, controller).accountID).toBe('host-account')
  expect(bindCodexAccount(model, controller).accountSource).toBe('host')
  expect(
    bindCodexAccount({ ...model, hostConnection: { status: 'unavailable' } }, controller).accountID,
  ).toBeUndefined()
  expect(
    bindCodexAccount({ ...model, hostConnection: { status: 'ready', id: 'credential:unknown' } }, controller).accountID,
  ).toBeUndefined()
})
