import { expect, test } from 'bun:test'

import { createLimitsModelSelection } from '../src/app/limits-model-selection'

import type { SelectedModel } from '../src/entities/provider-limit'
import type { Plugin } from '@opencode/plugin/tui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

const selected: SelectedModel = { providerID: 'provider', modelID: 'model', sessionID: 'session', variant: 'high' }

function harness() {
  let model = selected
  let enabled = true
  const calls: string[] = []
  const api = {
    state: {
      provider: [
        {
          id: 'provider',
          name: 'Provider Name',
          models: { model: { name: 'Model Name', variants: { low: {}, high: {} } } },
        },
      ],
    },
    keymap: {
      getCommands: () => ['model.list', 'variant.list'].map((name) => ({ name, enabled: () => enabled })),
      dispatchCommand: (name: string) => {
        calls.push(name)

        return { ok: true }
      },
    },
  } as unknown as TuiPluginApi

  return {
    api,
    calls,
    current: () => model,
    change: (value: SelectedModel) => {
      model = value
    },
    disable: () => {
      enabled = false
    },
  }
}

test('OpenCode 1 model controls use catalog display names and the native selection dialogs', () => {
  const h = harness()
  const controls = createLimitsModelSelection(h.api, h.current)

  expect(controls.names(selected)).toEqual({ provider: 'Provider Name', model: 'Model Name' })
  expect(controls.variants(selected)).toEqual(['low', 'high'])
  expect(controls.open('model', selected)).toBe(true)
  expect(controls.open('variant', selected)).toBe(true)
  expect(h.calls).toEqual(['model.list', 'variant.list'])
  h.disable()
  expect(controls.open('model', selected)).toBe(false)
  expect(h.calls).toHaveLength(2)
})

test('model controls reject a stale session, provider, or model without opening an unrelated picker', () => {
  for (const change of [{ sessionID: 'other' }, { providerID: 'other' }, { modelID: 'other' }]) {
    const h = harness()
    const controls = createLimitsModelSelection(h.api, h.current)

    h.change({ ...selected, ...change })
    expect(controls.open('model', selected)).toBe(false)
    expect(controls.open('variant', selected)).toBe(false)
    expect(h.calls).toHaveLength(0)
  }
})

test('OpenCode 2 model controls read location catalogs and selected-model variant capabilities', () => {
  const h = harness()
  const location = { directory: '/synthetic-workspace' }
  const context = {
    location,
    data: {
      location: {
        provider: { list: () => [{ id: 'provider', name: 'V2 Provider' }] },
        model: { list: () => [{ id: 'model', providerID: 'provider', modelID: 'native-id', name: 'V2 Model' }] },
      },
    },
    ui: { model: { variant: { list: () => ['high'] } } },
  } as unknown as Plugin.Context
  const controls = createLimitsModelSelection(h.api, h.current, context)

  expect(controls.names(selected)).toEqual({ provider: 'V2 Provider', model: 'V2 Model' })
  expect(controls.variants(selected)).toEqual(['high'])
  expect(controls.open('variant', selected)).toBe(true)
  expect(h.calls).toEqual(['variant.list'])
})
