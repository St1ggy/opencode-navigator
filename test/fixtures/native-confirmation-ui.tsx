/** @jsxImportSource @opentui/solid */
import { onCleanup } from 'solid-js'

import { createV2UI } from '../../src/app/opencode-v2/ui-adapter'

import type { Plugin } from '@opencode/plugin/tui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function useNativeConfirmationUI(api: TuiPluginApi) {
  const original = api.ui
  const lifecycle = new AbortController()

  onCleanup(() => lifecycle.abort())
  Object.assign(api, { lifecycle: { signal: lifecycle.signal } })
  const context = {
    ui: {
      toast: { show: original.toast },
      dialog: {
        show: original.dialog.replace,
        clear: original.dialog.clear,
        set: ({ size }: { size: 'medium' | 'large' | 'xlarge' }) => original.dialog.setSize(size),
        confirm: (props: { title: string; message: string }) =>
          new Promise<boolean | undefined>((resolve) => {
            original.dialog.replace(
              () => (
                <original.DialogConfirm
                  {...props}
                  onConfirm={() => {
                    resolve(true)
                    original.dialog.clear()
                  }}
                  onCancel={() => {
                    resolve(false)
                    original.dialog.clear()
                  }}
                />
              ),
              () => resolve(undefined),
            )
          }),
      },
    },
  } as unknown as Plugin.Context

  Object.assign(api, { ui: createV2UI(context, () => api) })
}
