import { expect, test } from 'bun:test'

import { createVersionUpdateActions } from '../src/features/version-footer'

import type { VersionUpdater } from '../src/features/version-footer'
import type { TuiDialogConfirmProps, TuiPluginApi } from '@opencode-ai/plugin/tui'

test('version updates require confirmation and report restart and update failures', async () => {
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
      throw new Error('Local Navigator installations must be updated from their source path.')
    },
  }
  const actions = createVersionUpdateActions(
    api,
    { openCodeUpdate: () => '2.0.17', navigatorUpdate: () => '0.16.0' },
    updater,
  )

  actions.openCode('2.0.17')
  expect(confirm?.message).toContain('current installation method')
  confirm?.onConfirm?.()
  await Bun.sleep(0)
  expect(updated).toEqual(['opencode:2.0.17'])
  expect(toasts.at(-1)).toMatchObject({ variant: 'success', message: expect.stringContaining('Restart OpenCode') })

  actions.navigator('0.16.0')
  confirm?.onConfirm?.()
  await Bun.sleep(0)
  expect(toasts.at(-1)).toMatchObject({
    variant: 'error',
    message: 'Local Navigator installations must be updated from their source path.',
  })
})
