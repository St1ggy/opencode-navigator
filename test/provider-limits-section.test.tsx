/** @jsxImportSource @opentui/solid */
import { type BoxRenderable, RGBA } from '@opentui/core'
import { createDefaultOpenTuiKeymap } from '@opentui/keymap/opentui'
import { testRender, useRenderer } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { Show, createSignal, onCleanup } from 'solid-js'

import { bindCodexAccount } from '../src/app/limits-account-model'
import { createLimitsModelSelection } from '../src/app/limits-model-selection'
import { LimitsPersistence } from '../src/app/limits-persistence'
import { pluginConfig } from '../src/config'
import {
  applyPreferencesUpdate,
  createPreferencesController,
  emptyPreferencesDocument,
} from '../src/entities/preferences'
import { createProviderLimitsController } from '../src/entities/provider-limit'
import { createCodexQuotaAdapter } from '../src/features/provider-limits/model/codex-quota-adapter'
import { ProviderLimitsSection, createSidebarInteraction } from '../src/pages/session-sidebar'
import { IconProvider } from '../src/shared/ui'

import type { PreferencesController } from '../src/entities/preferences'
import type { ProviderQuotaAdapter, ProviderQuotaSnapshot, SelectedModel } from '../src/entities/provider-limit'
import type { CodexAppServerClient } from '../src/features/provider-limits/model/codex-app-server'
import type { SidebarInteraction } from '../src/pages/session-sidebar'
import type { TuiDialogConfirmProps, TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { JSX } from 'solid-js'

const selected: SelectedModel = { providerID: 'openai', modelID: 'synthetic-codex', sessionID: 'session-one' }

function NativeModelPicker() {
  return <text>Native model picker</text>
}
function NativeVariantPicker() {
  return <text>Native variant picker</text>
}

async function harness(
  input: {
    hostConnection?: NonNullable<SelectedModel['hostConnection']>
    observe?: boolean
    countOnly?: boolean
    provider?: string
    variant?: string
    width?: number
    sidebarWidth?: number
    sidebarPadding?: number
    height?: number
    style?: 'nerd' | 'text'
    creditCount?: number
    sourceMessage?: string
    read?: ProviderQuotaAdapter['read']
    consume?: NonNullable<ProviderQuotaAdapter['consumeResetCredit']>
  } = {},
) {
  const [selection, setSelection] = createSignal<SelectedModel>({
    ...selected,
    providerID: input.provider ?? selected.providerID,
    ...(input.hostConnection && { hostConnection: input.hostConnection }),
    ...(input.variant && { variant: input.variant }),
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
      availableCount: input.creditCount ?? 3,
      ...(!input.countOnly &&
        input.creditCount !== 0 && {
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
    read: async (model, signal) => {
      reads++
      await Bun.sleep(5)

      if (failRead) throw new Error('Synthetic read failure')

      return input.read ? input.read(model, signal) : snapshot(model)
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
    Object.assign(api.state, {
      provider: [
        {
          id: input.provider ?? 'openai',
          name: input.provider ?? 'OpenAI',
          models: { 'synthetic-codex': { name: 'Synthetic Codex', variants: { low: {}, high: {} } } },
        },
      ],
    })
    keymap.registerLayer({
      commands: [
        {
          name: 'model.list',
          run: () => {
            setModal(() => NativeModelPicker)
          },
        },
        {
          name: 'variant.list',
          run: () => {
            setModal(() => NativeVariantPicker)
          },
        },
      ],
    })
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
      <IconProvider style={() => input.style ?? 'text'}>
        <Show when={input.observe}>
          <LimitsPersistence controller={controller} />
        </Show>
        <Show
          keyed
          when={modal()}
          fallback={
            <box
              ref={interaction.setContentRoot}
              id="limits-test-root"
              width={input.sidebarWidth}
              paddingLeft={input.sidebarPadding ?? 0}
              paddingRight={input.sidebarPadding ?? 0}
              focusable
            >
              <ProviderLimitsSection
                api={api}
                preferences={preferences}
                interaction={interaction}
                controller={controller}
                codex={adapter}
                modelSelection={createLimitsModelSelection(api, selection)}
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
  const setup = await testRender(() => <Harness />, { width: input.width ?? 80, height: input.height ?? 40 })

  await preferences.load()
  await setup.flush()

  async function click(label: string) {
    await setup.flush()
    const lines = setup.captureCharFrame().split('\n')
    const row = lines.findIndex((line) => line.includes(label))

    expect(row).toBeGreaterThanOrEqual(0)
    await setup.mockMouse.click(Bun.stringWidth(lines[row].slice(0, lines[row].indexOf(label))), row)
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
    expect(h.captureCharFrame()).toContain('[OpenAI] Synthetic Codex')
    expect(h.captureCharFrame()).toContain('0% left')
    expect(h.captureCharFrame()).toContain('Resets ')
    expect(h.captureCharFrame()).not.toContain('Updated ')
    expect(h.captureCharFrame()).toContain('Banked Resets')
    expect(h.captureCharFrame()).not.toContain('synthetic-account')
    expect(h.captureCharFrame()).not.toContain('Provider sources')
    await h.click('Banked Resets')
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
    expect(h.captureCharFrame()).toContain('Banked Resets')
    expect(h.captureCharFrame()).not.toContain('Link Codex CLI account')
    expect(h.captureCharFrame()).not.toContain('Unlink Codex account')
    h.setSelection({ ...selected, modelID: 'second-model', hostConnection })
    await h.controller.refresh(true)
    await h.flush()
    expect(h.controller.current().model?.accountID).toBe('synthetic-account')
    expect(h.captureCharFrame()).not.toContain('Link Codex CLI account')
    await h.click('Banked Resets')
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
      await h.click('Banked Resets')
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
    await h.click('Banked Resets')
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
    expect(unsupported.captureCharFrame()).not.toContain('Banked Resets')
    expect(unsupported.reads()).toBe(0)
    expect(unsupported.captureCharFrame()).not.toContain('Provider sources')
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
    expect(h.captureCharFrame()).toContain('0% left')
    expect(h.interaction.available().some((item) => item.id === 'opencode-navigator.limits.refresh')).toBe(true)
  } finally {
    h.destroy()
  }
})

test('Limits renders the real nullable Codex account bucket with explicit scope and count-only credits', async () => {
  const native = createCodexQuotaAdapter({
    async request(method: string) {
      if (method === 'account/read') return { account: { type: 'chatgpt' } }

      const limit = {
        limitId: 'codex',
        limitName: null,
        normalModelSlug: null,
        primary: { usedPercent: 35, windowDurationMins: 300, resetsAt: 1_800_000_000 },
        secondary: null,
      }

      return {
        accountId: 'synthetic-account',
        ordinaryUsageAllowed: true,
        rateLimits: limit,
        rateLimitsByLimitId: { codex: limit },
        rateLimitResetCredits: { availableCount: 2, credits: null },
      }
    },
    dispose() {},
  } as unknown as CodexAppServerClient)
  const h = await harness({ read: native.read })

  try {
    await h.link()
    expect(h.captureCharFrame()).not.toContain('Account · 5h')
    expect(h.captureCharFrame()).toContain('65% left')
    expect(h.captureCharFrame()).toContain('Banked Resets')
    expect(h.captureCharFrame()).not.toContain('No documented quota bucket')
    await h.click('Banked Resets')
    expect(h.captureCharFrame()).toContain('2 available')
    expect(h.consumes()).toBe(0)
  } finally {
    h.destroy()
  }
})

test('compact Limits puts actions in the header and keeps remaining value, scale, and reset colors distinct', async () => {
  const h = await harness({ variant: 'high' })

  try {
    await h.link()
    const lines = h.captureCharFrame().split('\n')
    const header = lines.findIndex((line) => line.includes('LIMITS'))
    const remaining = lines.findIndex((line) => line.includes('0% left'))
    const buffer = h.renderer.currentRenderBuffer
    const color = (row: number, column: number) => {
      const offset = (row * buffer.width + column) * 4

      return new RGBA(buffer.buffers.fg.slice(offset, offset + 4))
    }

    expect(lines[header]).toContain('Banked Resets')
    expect(lines[header]).not.toContain('3')
    expect(lines[header + 2]).toContain('[OpenAI] Synthetic Codex')
    expect(lines[header + 2]).toContain('·')
    expect(lines[header + 2]).toContain('high')
    expect(lines[remaining]).toContain('Resets ')
    expect(color(remaining, lines[remaining].indexOf('0%')).equals(RGBA.fromHex('#ffffff'))).toBe(true)
    expect(color(remaining - 1, lines[remaining - 1].indexOf('---')).equals(RGBA.fromHex('#aaaaaa'))).toBe(true)
    expect(lines[remaining - 1]).toContain('| ')
    expect(color(remaining, lines[remaining].indexOf('Resets')).equals(RGBA.fromHex('#aaaaaa'))).toBe(true)
    expect(h.captureCharFrame()).not.toContain('Unlink Codex')
    expect(h.captureCharFrame()).not.toContain('Updated ')
    const refresh = h.renderer.root.findDescendantById('opencode-navigator.limits.refresh') as BoxRenderable

    expect(refresh.width).toBe(3)
    expect(refresh.screenY).toBe(header)
    const previous = h.reads()

    await h.mockMouse.click(refresh.screenX + 1, refresh.screenY)
    await h.flush()
    expect(h.reads()).toBe(previous + 1)
    expect(h.preferences.expanded().limits).toBe(true)
  } finally {
    h.destroy()
  }
})

test('model and variant controls open native pickers on mouse release and keyboard activation', async () => {
  const mouse = await harness({ variant: 'high' })

  try {
    const control = mouse.renderer.root.findDescendantById('opencode-navigator.limits.model') as BoxRenderable

    await mouse.mockMouse.pressDown(control.screenX + 1, control.screenY)
    expect(mouse.api.ui.dialog.open).toBe(false)
    await mouse.mockMouse.release(control.screenX + 1, control.screenY)
    await mouse.flush()
    expect(mouse.captureCharFrame()).toContain('Native model picker')
    expect(mouse.api.ui.dialog.open).toBe(true)
  } finally {
    mouse.destroy()
  }
  const keyboard = await harness({ variant: 'high' })

  try {
    keyboard.interaction.focus(undefined, 'opencode-navigator.limits.model')
    await keyboard.flush()
    expect(keyboard.interaction.ownsFocus()).toBe(true)
    keyboard.mockInput.pressArrow('right')
    expect(keyboard.interaction.selectedId()).toBe('opencode-navigator.limits.variant')
    keyboard.mockInput.pressEnter()
    await keyboard.flush()
    expect(keyboard.captureCharFrame()).toContain('Native variant picker')
  } finally {
    keyboard.destroy()
  }
})

test('Banked Resets remains clickable with narrow header layout and disappears when no credit is available', async () => {
  const h = await harness({ width: 34, variant: 'high', style: 'nerd' })

  try {
    await h.link()
    expect(h.captureCharFrame()).toContain('Banked Resets')
    expect(h.captureCharFrame()).toContain('high')
    const credits = h.renderer.root.findDescendantById('opencode-navigator.limits.credits') as BoxRenderable

    await h.mockMouse.pressDown(credits.screenX + 1, credits.screenY)
    expect(h.api.ui.dialog.open).toBe(false)
    await h.mockMouse.release(credits.screenX + 1, credits.screenY)
    await h.flush()
    expect(h.preferences.expanded().limits).toBe(true)
    expect(h.captureCharFrame()).toContain('Banked resets · 3')
    expect(h.captureCharFrame()).toContain('available')
    expect(h.consumes()).toBe(0)
  } finally {
    h.destroy()
  }
  const empty = await harness({ creditCount: 0 })

  try {
    await empty.link()
    expect(empty.captureCharFrame()).not.toContain('Banked Resets')
    await empty.preferences.beginResetAttempt({
      providerID: selected.providerID,
      modelID: selected.modelID,
      accountID: 'synthetic-account',
      idempotencyKey: '00000000-0000-4000-8000-000000000001',
      createdAt: Date.now(),
    })
    await empty.flush()
    await empty.click('Banked Resets')
    expect(empty.captureCharFrame()).toContain('Reconcile pending attempt')
    expect(empty.consumes()).toBe(0)
  } finally {
    empty.destroy()
  }
})

test('Limits fills its sidebar content area without painting into the surrounding terminal', async () => {
  const h = await harness({ width: 80, sidebarWidth: 38, sidebarPadding: 2, variant: 'high' })

  try {
    await h.link()
    const root = h.renderer.root.findDescendantById('limits-test-root') as BoxRenderable
    const lines = h.captureCharFrame().split('\n')
    const row = lines.findIndex((line) => line.includes('0% left'))
    const right = root.screenX + root.width - 2

    expect(Bun.stringWidth(lines[row].trimEnd())).toBe(right)
    expect(lines[row]).toContain('Resets ')
    expect(lines[row]).not.toContain('Account')
    expect(lines[row - 1].slice(right).trim()).toBe('')
    expect(Bun.stringWidth(lines[row - 1].trimEnd())).toBe(right)
    expect(h.captureCharFrame()).not.toContain('1w')
  } finally {
    h.destroy()
  }
})
