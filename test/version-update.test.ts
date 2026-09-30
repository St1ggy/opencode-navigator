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
