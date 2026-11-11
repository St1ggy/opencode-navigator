import { onCleanup } from 'solid-js'

import { GuiBugReportConfirmation, GuiBugReportDialog } from '../../features/sidebar-settings/gui'
import { createBugReportModel } from '../../features/sidebar-settings/model'

import { bugReportIpc } from './ipc/bug-report'

import type { Context } from '@opencode/plugin/gui'

export function createGuiBugReport(context: Context) {
  const ipc = context.main(bugReportIpc(context.id))

  return () =>
    context.dialogs.open((dialog) => {
      const abort = new AbortController()
      const signal = AbortSignal.any([context.signal, abort.signal])
      let token = ''

      onCleanup(() => abort.abort())
      const model = createBugReportModel(
        {
          navigatorVersion: __NAVIGATOR_VERSION__,
          openCodeVersion: context.app.version,
          platform: context.app.platform,
          runtime: 'OpenCode Desktop GUI',
        },
        {
          probe: () => ipc.probe({ signal }),
          send: (draft) => ipc.send({ token, draft }, { signal }),
          open: async (url) => {
            context.system.openExternal(url)

            return true
          },
        },
        signal,
      )

      async function review() {
        const draft = { ...model.draft() }

        token = await ipc.prepare(draft, { signal })
        signal.throwIfAborted()

        if (JSON.stringify(draft) !== JSON.stringify(model.draft())) return

        const send = () => model.send(draft)

        context.dialogs.open((confirmation) => (
          <GuiBugReportConfirmation ui={context.ui} draft={draft} close={confirmation.close} send={send} />
        ))
      }
      async function browse() {
        const target = model.browser()

        if (target.needsCopy) await context.system.copy(target.copyText)

        await model.open(target.url)
      }

      return <GuiBugReportDialog ui={context.ui} model={model} review={review} browse={browse} close={dialog.close} />
    })
}
