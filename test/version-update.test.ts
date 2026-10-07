import { expect, test } from 'bun:test'

import { createVersionUpdateActions } from '../src/features/version-footer'

import type { VersionUpdater } from '../src/features/version-footer'
import type { TuiDialogConfirmProps, TuiPluginApi } from '@opencode-ai/plugin/tui'

test('version updates require confirmation and report restart and update failures', async () => {
  const hostTarget = '2.1.0'
  const navigatorTarget = '1.2.4'
  let confirm: TuiDialogConfirmProps | undefined
  const toasts: { variant: string; title?: string; message: string }[] = []
  const updated: string[] = []
  const api = {
    ui: {
      DialogConfirm: (props: TuiDialogConfirmProps) => {
        confirm = props

        return null
      },
      dialog: {
        replace: (render: () => unknown) => render(),
        clear() {},
      },
      toast: (toast: (typeof toasts)[number]) => toasts.push(toast),
    },
    keymap: { registerLayer: () => () => {} },
    lifecycle: { onDispose() {} },
  } as unknown as TuiPluginApi
  const updater: VersionUpdater = {
    async openCode(target) {
      updated.push(`opencode:${target}`)
    },
    async navigator() {
      throw new Error('Package download failed')
    },
  }
  const actions = createVersionUpdateActions(
    api,
    { openCodeUpdate: () => hostTarget, navigatorUpdate: () => navigatorTarget },
    updater,
    async () => {
      updated.push('remember current Navigator version')
    },
  )

  actions.openCode(hostTarget)
  expect(confirm?.message).toContain('current installation method')
  confirm?.onConfirm?.()
  await Bun.sleep(0)
  expect(updated).toEqual([`opencode:${hostTarget}`])
  expect(toasts.at(-1)).toMatchObject({ variant: 'success', message: expect.stringContaining('Restart OpenCode') })

  actions.navigator(navigatorTarget)
  confirm?.onConfirm?.()
  await Bun.sleep(0)
  expect(updated.at(-1)).toBe('remember current Navigator version')
  expect(toasts.at(-1)).toMatchObject({
    variant: 'error',
    message: 'Package download failed',
  })
})

test('manual check/update commands report results, require confirmation, and reject stale or duplicate installs', async () => {
  let version: string | undefined = '1.2.4'
  let result: 'update' | 'current' | 'unavailable' = 'update'
  let confirm: TuiDialogConfirmProps | undefined
  let installations = 0
  let remembered = 0
  let rejectRead = false
  const disposers: (() => void)[] = []
  const commands: { name: string; run: () => void }[] = []
  const messages: string[] = []
  const api = {
    ui: {
      DialogConfirm: (props: TuiDialogConfirmProps) => {
        confirm = props

        return null
      },
      dialog: { replace: (render: () => unknown) => render(), clear() {} },
      toast: (toast: { message: string }) => messages.push(toast.message),
    },
    keymap: {
      registerLayer: (layer: { commands: typeof commands }) => {
        commands.push(...layer.commands)

        return () => {}
      },
    },
    lifecycle: { onDispose: (dispose: () => void) => disposers.push(dispose) },
  } as unknown as TuiPluginApi

  createVersionUpdateActions(
    api,
    {
      openCodeUpdate: () => '2.1.0',
      navigatorUpdate: () => version,
      refreshNavigator: async () => {
        if (rejectRead) throw new Error('Network error')

        return result
      },
    },
    {
      openCode: async () => {},
      navigator: async () => {
        installations++
        await Bun.sleep(10)
      },
    },
    async () => {
      remembered++
    },
  )
  const run = async (name: string) => {
    commands.find((command) => command.name === `opencode-navigator.${name}`)?.run()
    await Bun.sleep(0)
  }

  await run('check-update')
  expect(messages.at(-1)).toContain('1.2.4 is available')
  expect(installations).toBe(0)
  result = 'current'
  await run('update-navigator')
  expect(messages.at(-1)).toContain('up to date')
  expect(confirm).toBeUndefined()
  result = 'unavailable'
  await run('check-update')
  expect(messages.at(-1)).toContain('Could not check')
  rejectRead = true
  await run('update-navigator')
  expect(messages.at(-1)).toContain('Could not check')
  rejectRead = false
  result = 'update'
  await run('update-navigator')
  expect(confirm?.title).toBe('Update Navigator')
  expect(installations).toBe(0)
  const cancelled = confirm!

  cancelled.onCancel?.()
  cancelled.onConfirm?.()
  await Bun.sleep(0)
  expect(installations).toBe(0)
  await run('update-navigator')
  const stale = confirm!

  version = '1.2.5'
  stale.onConfirm?.()
  await Bun.sleep(0)
  expect(installations).toBe(0)
  await run('update-navigator')
  confirm?.onConfirm?.()
  confirm?.onConfirm?.()
  await Bun.sleep(20)
  expect(installations).toBe(1)
  expect(remembered).toBe(1)
  expect(messages.at(-1)).toContain('Restart OpenCode')
  confirm?.onConfirm?.()
  await run('update-navigator')
  expect(installations).toBe(1)
  expect(messages.at(-1)).toContain('installed update')
  version = '1.2.6'
  await run('update-navigator')
  for (const dispose of disposers) dispose()
  confirm?.onConfirm?.()
  const messageCount = messages.length

  await run('check-update')
  expect(installations).toBe(1)
  expect(messages).toHaveLength(messageCount)
})
