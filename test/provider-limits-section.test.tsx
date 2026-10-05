/** @jsxImportSource @opentui/solid */
import { createDefaultOpenTuiKeymap } from '@opentui/keymap/opentui'
import { testRender, useRenderer } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { Show, createSignal, onCleanup } from 'solid-js'

import { bindCodexAccount } from '../src/app/limits-account-model'
import { LimitsPersistence } from '../src/app/limits-persistence'
import { pluginConfig } from '../src/config'
import {
  applyPreferencesUpdate,
  createPreferencesController,
  emptyPreferencesDocument,
} from '../src/entities/preferences'
import { createProviderLimitsController } from '../src/entities/provider-limit'
import { ProviderLimitsSection, createSidebarInteraction } from '../src/pages/session-sidebar'
import { IconProvider } from '../src/shared/ui'

import type { PreferencesController } from '../src/entities/preferences'
import type { ProviderQuotaAdapter, ProviderQuotaSnapshot, SelectedModel } from '../src/entities/provider-limit'
import type { SidebarInteraction } from '../src/pages/session-sidebar'
import type { TuiDialogConfirmProps, TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { JSX } from 'solid-js'

const selected: SelectedModel = { providerID: 'openai', modelID: 'synthetic-codex', sessionID: 'session-one' }

async function harness(
  input: {
    hostConnection?: NonNullable<SelectedModel['hostConnection']>
    observe?: boolean
    countOnly?: boolean
    provider?: string
    sourceMessage?: string
    consume?: NonNullable<ProviderQuotaAdapter['consumeResetCredit']>
  } = {},
) {
  const [selection, setSelection] = createSignal<SelectedModel>({
    ...selected,
    providerID: input.provider ?? selected.providerID,
    ...(input.hostConnection && { hostConnection: input.hostConnection }),
  })
  const [modal, setModal] = createSignal<() => JSX.Element>()
  let onClose: (() => void) | undefined
  let api!: TuiPluginApi
  let preferences!: PreferencesController
  let interaction!: SidebarInteraction
  let controller!: ReturnType<typeof createProviderLimitsController>
  let confirmation!: TuiDialogConfirmProps
  let reads = 0
  let consumes = 0
  let failRead = false
  const messages: string[] = []
  const consumedKeys: string[] = []
  let document = emptyPreferencesDocument()
  const snapshot = (model: SelectedModel): ProviderQuotaSnapshot => ({
    model,
    providerId: 'codex',
    providerName: 'Codex CLI',
    accountId: model.accountID,
    availability: 'ready',
    fetchedAt: 1_800_000_000_000,
    ...(input.sourceMessage && { message: input.sourceMessage }),
    ordinaryUsageAllowed: false,
    windows: [
      {
        id: 'window-one',
        modelID: model.modelID,
        limitID: 'codex',
        label: 'Primary',
        unit: '%',
        used: 100,
        durationMinutes: 300,
        resetsAt: 1_800_000_600,
      },
    ],
    bankedResets: {
      availableCount: 3,
      ...(!input.countOnly && {
        credits: [
          {
            id: 'credit-one',
            type: 'codexRateLimits',
            status: 'available' as const,
            grantedAt: 1_800_000_000,
            title: 'Synthetic reset',
            expiresAt: 1_900_000_000,
          },
        ],
      }),
    },
  })
  const adapter: ProviderQuotaAdapter = {
    id: 'codex',
    name: 'Codex CLI',
    supports: (model) => model.providerID === 'openai' && Boolean(model.accountID),
    discoverAccount: async () => 'synthetic-account',
    read: async (model) => {
      reads++
      await Bun.sleep(5)

      if (failRead) throw new Error('Synthetic read failure')

      return snapshot(model)
    },
    prepareResetCreditConsumption: async (model) => snapshot(model),
    consumeResetCredit: async (model, attempt, signal) => {
      consumes++
      consumedKeys.push(attempt.idempotencyKey)

      return input.consume ? input.consume(model, attempt, signal) : 'reset'
    },
  }

  function Harness() {
    const renderer = useRenderer()
    const keymap = createDefaultOpenTuiKeymap(renderer)
    const register = keymap.registerLayer.bind(keymap)

    keymap.registerLayer = (layer) => {
      const copy = { ...layer }

      Reflect.deleteProperty(copy, 'mode')

      return register(copy)
    }
    api = {
      renderer,
      keymap,
      route: { current: { name: 'session', params: { sessionID: selected.sessionID } } },
      state: { ready: true, path: { directory: '/synthetic/workspace', worktree: '/synthetic/workspace' } },
      kv: { get() {} },
      theme: {
        current: {
          text: '#ffffff',
          textMuted: '#aaaaaa',
          accent: '#00ffff',
          primary: '#00ffff',
          backgroundElement: '#333333',
          backgroundPanel: '#111111',
          selectedListItemText: '#111111',
          borderSubtle: '#555555',
          warning: '#ffff00',
        },
      },
      ui: {
        toast: (value: { message: string }) => messages.push(value.message),
        dialog: {
          get open() {
            return Boolean(modal())
          },
          setSize() {},
          replace(render: () => JSX.Element, close?: () => void) {
            onClose?.()
            onClose = close
            setModal(() => render)
          },
          clear() {
            onClose?.()
            onClose = undefined
            setModal(undefined)
          },
        },
        DialogConfirm(props: TuiDialogConfirmProps) {
          confirmation = props
          const dispose = keymap.registerLayer({
            priority: 1000,
            commands: [{ name: 'test.confirm', run: () => props.onConfirm?.() }],
            bindings: [{ key: 'return', cmd: 'test.confirm' }],
          })

          onCleanup(dispose)

          return (
            <box>
              <text>{props.title}</text>
              <text>{props.message}</text>
              <text
                onMouseUp={(event) => {
                  event.stopPropagation()
                  props.onConfirm?.()
                }}
              >
                Confirm
              </text>
              <text
                onMouseUp={(event) => {
                  event.stopPropagation()
                  props.onCancel?.()
                }}
              >
                Cancel
              </text>
            </box>
          )
        },
      },
    } as unknown as TuiPluginApi
    preferences = createPreferencesController(api, pluginConfig(undefined), {
      load: async () => document,
      update: async (update) => {
        document = applyPreferencesUpdate(document, update)
      },
      flush: async () => {},
    })
    controller = createProviderLimitsController([adapter], () => {
      const model = selection()

      return bindCodexAccount(model, preferences)
    })
    interaction = createSidebarInteraction(api, () => {})

    return (
      <IconProvider style={() => 'text'}>
        <Show when={input.observe}>
          <LimitsPersistence controller={controller} />
        </Show>
        <Show
          keyed
          when={modal()}
          fallback={
            <box ref={interaction.setContentRoot}>
              <ProviderLimitsSection
                api={api}
                preferences={preferences}
                interaction={interaction}
                controller={controller}
                codex={adapter}
                navigationSection={1}
              />
            </box>
          }
        >
          {(render) => render()}
        </Show>
      </IconProvider>
    )
  }
  const setup = await testRender(() => <Harness />, { width: 80, height: 40 })

  await preferences.load()
  await setup.flush()

  async function click(label: string) {
    await setup.flush()
    const lines = setup.captureCharFrame().split('\n')
    const row = lines.findIndex((line) => line.includes(label))

    expect(row).toBeGreaterThanOrEqual(0)
    await setup.mockMouse.click(lines[row].indexOf(label), row)
    await setup.flush()
  }
  async function link() {
    await click('Link Codex CLI account')
    await click('Confirm')
    await controller.refresh(true)
    await setup.flush()
  }

  return {
    ...setup,
    api,
    preferences,
    controller,
    interaction,
    click,
    link,
    setSelection,
    confirmation: () => confirmation,
    reads: () => reads,
    consumes: () => consumes,
    consumedKeys,
    messages,
    failRead: () => {
      failRead = true
    },
    destroy() {
      controller.dispose()
      interaction.dispose()
      setup.renderer.destroy()
    },
  }
}

test('Limits defaults first and expanded, requires deliberate binding, and shows native windows and count-only credits', async () => {
  const h = await harness({ countOnly: true })

  try {
    expect(h.preferences.sectionOrder()[0]).toBe('limits')
    expect(h.preferences.sections().limits).toBe(true)
    expect(h.preferences.expanded().limits).toBe(true)
    expect(h.captureCharFrame()).toContain('Link the matching Codex account')
    expect(h.reads()).toBe(0)
    await h.link()
    expect(h.captureCharFrame()).toContain('Primary · 300 min')
    expect(h.captureCharFrame()).toContain('100% used')
    expect(h.captureCharFrame()).toContain('resets ')
    expect(h.captureCharFrame()).toContain('Updated ')
    expect(h.captureCharFrame()).toContain('Banked resets: 3')
    await h.click('Review reset credits')
    expect(h.captureCharFrame()).toContain('3 available')
    expect(h.captureCharFrame()).toContain('Credit details unavailable')
    expect(h.consumes()).toBe(0)
    await h.click('Use next available credit')
    expect(h.captureCharFrame()).toContain('Use one banked reset?')
    await h.click('Cancel')
    expect(h.captureCharFrame()).toContain('Use next available credit')
    expect(h.consumes()).toBe(0)
  } finally {
    h.destroy()
  }
})

test('mounted Limits persistence reads once per target without reacting to its own request state', async () => {
  const h = await harness({ observe: true })

  try {
    h.preferences.setCodexAccountBinding(selected.providerID, selected.modelID, 'synthetic-account')
    await Bun.sleep(100)
    await h.flush()
    expect(h.reads()).toBe(1)
    expect(h.controller.state().status).toBe('ready')
    h.setSelection({ ...selected, sessionID: 'session-two' })
    await Bun.sleep(100)
    await h.flush()
    expect(h.reads()).toBe(2)
    expect(h.controller.state().status).toBe('ready')
  } finally {
    h.destroy()
  }
})

test('automatically matched OpenCode accounts need no Link control when switching models', async () => {
  const hostConnection = { status: 'ready' as const, id: 'credential:one', accountID: 'synthetic-account' }
  const h = await harness({ hostConnection })

  try {
    await h.controller.refresh(true)
    await h.flush()
    expect(h.captureCharFrame()).toContain('Banked resets: 3')
    expect(h.captureCharFrame()).not.toContain('Link Codex CLI account')
    expect(h.captureCharFrame()).not.toContain('Unlink Codex account')
    h.setSelection({ ...selected, modelID: 'second-model', hostConnection })
    await h.controller.refresh(true)
    await h.flush()
    expect(h.controller.current().model?.accountID).toBe('synthetic-account')
    expect(h.captureCharFrame()).not.toContain('Link Codex CLI account')
    await h.click('Review reset credits')
    await h.click('Synthetic reset')
    const previous = h.confirmation()

    h.setSelection({
      ...selected,
      hostConnection: { status: 'ready', id: 'credential:two', accountID: 'other-account' },
    })
    await h.flush()
    previous.onConfirm?.()
    expect(h.consumes()).toBe(0)
    expect(h.api.ui.dialog.open).toBe(false)
  } finally {
    h.destroy()
  }
})

test('a manual connection confirmation is reused across models and unknown host metadata never requests a link', async () => {
  const hostConnection = { status: 'ready' as const, id: 'credential:one' }
  const h = await harness({ hostConnection })

  try {
    await h.link()
    h.setSelection({ ...selected, modelID: 'second-model', hostConnection })
    await h.controller.refresh(true)
    await h.flush()
    expect(h.controller.current().model?.accountID).toBe('synthetic-account')
    expect(h.captureCharFrame()).not.toContain('Link Codex CLI account')
    h.setSelection({ ...selected, hostConnection: { status: 'loading' } })
    await h.flush()
    expect(h.captureCharFrame()).toContain('Checking the OpenCode account')
    expect(h.captureCharFrame()).not.toContain('Link Codex CLI account')
  } finally {
    h.destroy()
  }
})

test('Limits keyboard opens credit review, Escape restores its selection, and only confirmation consumes once', async () => {
  const h = await harness()

  try {
    await h.link()
    h.interaction.select('opencode-navigator.limits.credits')
    h.interaction.activate()
    await h.flush()
    h.mockInput.pressEnter()
    await h.flush()
    expect(h.captureCharFrame()).toContain('Use one banked reset?')
    expect(h.consumes()).toBe(0)
    h.mockInput.pressEscape()
    await Bun.sleep(60)
    await h.flush()
    expect(h.captureCharFrame()).toContain('Synthetic reset')
    h.mockInput.pressEnter()
    await h.flush()
    const confirmation = h.confirmation()

    confirmation.onConfirm?.()
    confirmation.onConfirm?.()
    await h.flush()
    expect(h.consumes()).toBe(1)
    expect(h.preferences.pendingResetAttempt()).toBeUndefined()
    for (
      let attempt = 0;
      attempt < 20 && h.messages.every((message) => !message.includes('Reset applied'));
      attempt++
    ) {
      await Bun.sleep(5)
      await h.flush()
    }
    expect(h.messages.some((message) => message.includes('Reset applied'))).toBe(true)
  } finally {
    h.destroy()
  }
})

test('Limits closes stale confirmation on provider, model, session, or account changes', async () => {
  for (const change of [
    { providerID: 'another' },
    { modelID: 'another-model' },
    { sessionID: 'another-session' },
    { unlink: true },
  ]) {
    const h = await harness()

    try {
      await h.link()
      await h.click('Review reset credits')
      await h.click('Synthetic reset')
      const previous = h.confirmation()

      if ('unlink' in change) h.preferences.setCodexAccountBinding(selected.providerID, selected.modelID)
      else h.setSelection({ ...selected, ...change })

      await h.flush()
      expect(h.api.ui.dialog.open).toBe(false)
      previous.onConfirm?.()
      await h.flush()
      expect(h.consumes()).toBe(0)
    } finally {
      h.destroy()
    }
  }
})

test('Limits preserves a pending attempt after timeout and reconciles with the same key', async () => {
  let submissions = 0
  const h = await harness({
    consume: async () => {
      if (++submissions === 1) throw new Error('Synthetic timeout')

      return 'alreadyRedeemed'
    },
  })

  try {
    await h.link()
    await h.click('Review reset credits')
    await h.click('Synthetic reset')
    await h.click('Confirm')
    expect(h.captureCharFrame()).toContain('Reconcile pending attempt')
    expect(h.preferences.pendingResetAttempt()).toBeDefined()
    await h.click('Reconcile pending attempt')
    expect(h.consumedKeys).toHaveLength(2)
    expect(h.consumedKeys[0]).toBe(h.consumedKeys[1])
    expect(h.preferences.pendingResetAttempt()).toBeUndefined()
  } finally {
    h.destroy()
  }
})

test('Limits keeps unsupported providers calm and shows stale read failures with Retry', async () => {
  const unsupported = await harness({ provider: 'synthetic-provider' })

  try {
    expect(unsupported.captureCharFrame()).toContain('No independent quota/balance API or native counter semantics')
    expect(unsupported.captureCharFrame()).not.toContain('Refresh')
    expect(unsupported.captureCharFrame()).not.toContain('Review reset credits')
    expect(unsupported.reads()).toBe(0)
    await unsupported.click('Provider sources')
    expect(unsupported.captureCharFrame()).toContain('Provider sources')
    expect(unsupported.captureCharFrame()).toContain('AIHubMix')
  } finally {
    unsupported.destroy()
  }
  const h = await harness({ sourceMessage: 'Provider-native API limits observed for the selected model.' })

  try {
    await h.link()
    h.failRead()
    await h.controller.refresh(true)
    await h.flush()
    expect(h.captureCharFrame()).toContain('Stale · refresh failed')
    expect(h.captureCharFrame()).toContain('Retry')
    expect(h.captureCharFrame()).toContain('100% used')
  } finally {
    h.destroy()
  }
})
