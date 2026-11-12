/** @jsxImportSource @opentui/solid */
import { testRender } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { Show, createSignal } from 'solid-js'

import { createV2UI } from '../src/app/opencode-v2/ui-adapter'
import { createDialogStack } from '../src/shared/ui/dialog/dialog-stack'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { Plugin } from '@opencode/plugin/tui'
import type { JSX } from 'solid-js'

async function harness() {
  const [render, setRender] = createSignal<() => JSX.Element>()
  const lifecycle = new AbortController()
  let close: (() => void) | undefined
  let settle: ((value: boolean | undefined) => void) | undefined
  let confirmations = 0
  let cancellations = 0
  const show = (next?: () => JSX.Element, onClose?: () => void) => {
    close?.()
    close = onClose
    setRender(() => next)
  }
  const context = {
    keymap: { mode: { current: () => (render() ? 'modal' : 'base') } },
    ui: {
      dialog: {
        show,
        clear: () => show(),
        set() {},
        confirm: () =>
          new Promise<boolean | undefined>((resolve) => {
            let settled = false
            const done = (value?: boolean) => {
              if (settled) return

              settled = true
              resolve(value)
            }

            settle = done
            show(() => <text>Native confirmation</text>, done)
          }),
      },
    },
  } as unknown as Plugin.Context
  const ui = createV2UI(context, () => api)
  const api = {
    lifecycle: { signal: lifecycle.signal },
    ui,
    keymap: { registerLayer: () => () => {} },
  } as unknown as TuiPluginApi
  const setup = await testRender(
    () => (
      <Show when={render()} keyed>
        {(content) => content()}
      </Show>
    ),
    {
      width: 80,
      height: 25,
    },
  )
  const dialogs = createDialogStack(api)
  const open = () =>
    dialogs.open(() => (
      <ui.DialogConfirm
        title="Confirm account"
        message="Synthetic account connection"
        onConfirm={() => {
          confirmations++
          dialogs.back()
        }}
        onCancel={() => {
          cancellations++
          dialogs.back()
        }}
      />
    ))

  return {
    ...setup,
    api,
    dialogs,
    lifecycle,
    open,
    confirmations: () => confirmations,
    cancellations: () => cancellations,
    finish(value: boolean | undefined) {
      settle?.(value)

      if (close === settle) show()
    },
    escape: () => show(),
    replaceExternally(result?: boolean) {
      if (result !== undefined) settle?.(result)

      show(() => <text>External host dialog</text>)
    },
  }
}

test.each([true, false, undefined])('native confirmation delivers %s after replacing its wrapper', async (result) => {
  const h = await harness()

  try {
    h.dialogs.open(() => <text>Previous screen</text>)
    await h.flush()
    h.open()
    await h.flush()
    expect(h.captureCharFrame()).toContain('Native confirmation')
    expect(h.api.ui.dialog.open).toBe(true)
    h.finish(result)
    await h.flush()
    expect(h.confirmations()).toBe(result === true ? 1 : 0)
    expect(h.cancellations()).toBe(result === true ? 0 : 1)
    expect(h.captureCharFrame()).toContain('Previous screen')
  } finally {
    h.renderer.destroy()
  }
})

test.each([
  [true, undefined],
  [false, undefined],
  [true, true],
  [false, true],
  [true, false],
  [false, false],
] as const)(
  'external replacement preserves its dialog with parent frame %s after result %s',
  async (parent, result) => {
    const h = await harness()

    try {
      if (parent) {
        h.dialogs.open(() => <text>Previous screen</text>)
        await h.flush()
      }

      h.open()
      await h.flush()
      expect(h.captureCharFrame()).toContain('Native confirmation')
      h.replaceExternally(result)
      await h.flush()
      expect(h.confirmations()).toBe(0)
      expect(h.cancellations()).toBe(0)
      expect(h.captureCharFrame()).toContain('External host dialog')
      expect(h.captureCharFrame()).not.toContain('Previous screen')
      expect(h.api.ui.dialog.open).toBe(false)
    } finally {
      h.renderer.destroy()
    }
  },
)

test.each([
  [true, 'Escape'],
  [false, 'Escape'],
  [true, 'Cancel'],
  [false, 'Cancel'],
] as const)('native confirmation with parent frame %s returns on %s', async (parent, action) => {
  const h = await harness()

  try {
    if (parent) {
      h.dialogs.open(() => <text>Previous screen</text>)
      await h.flush()
    }

    h.open()
    await h.flush()

    if (action === 'Escape') h.escape()
    else h.finish(false)

    await h.flush()
    expect(h.confirmations()).toBe(0)
    expect(h.cancellations()).toBe(1)
    expect(h.captureCharFrame()).not.toContain('Native confirmation')
    expect(h.captureCharFrame().includes('Previous screen')).toBe(parent)
    expect(h.api.ui.dialog.open).toBe(parent)
  } finally {
    h.renderer.destroy()
  }
})

test.each(['replace', 'clear', 'dispose'])('native confirmation ignores results after %s', async (action) => {
  const h = await harness()

  try {
    h.open()
    await h.flush()

    if (action === 'replace') h.dialogs.replace(() => <text>New screen</text>)
    else if (action === 'clear') h.dialogs.close()
    else h.lifecycle.abort()

    h.finish(true)
    await h.flush()
    expect(h.confirmations()).toBe(0)
    expect(h.cancellations()).toBe(0)

    if (action === 'replace') expect(h.captureCharFrame()).toContain('New screen')
  } finally {
    h.renderer.destroy()
  }
})
