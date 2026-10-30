import { createMemo, createSignal, onMount } from 'solid-js'

import { useDialogState, useDialogs } from '../../../shared/ui'
import { BugReportConfirmation } from '../ui/bug-report-confirmation'

import { registerBugReportNavigation } from './bug-report-navigation'

import type { BugReportController } from './bug-report-controller'
import type { UiIcon } from '../../../shared/ui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { BoxRenderable, InputRenderable, TextareaRenderable } from '@opentui/core'

type ReportAction = { label: string; icon: UiIcon; disabled: boolean; run(): void }

export function createBugReportDialogController(api: TuiPluginApi, model: BugReportController) {
  const dialogs = useDialogs(api)
  const [active, setActive] = useDialogState('report-field', 0)
  const [notice, setNotice] = useDialogState('report-notice', '')
  const [copyLink, setCopyLink] = useDialogState('browser-failed', false)
  const [cursor, setCursor] = useDialogState('report-cursor', 0)
  const [hovered, setHovered] = createSignal<number>()
  let title: InputRenderable | undefined
  let body: TextareaRenderable | undefined
  let actions: BoxRenderable | undefined
  const focus = (index: number) => {
    setActive(index)
    setHovered(undefined)

    if (index === 0) title?.focus()
    else if (index === 1) body?.focus()
    else actions?.focus()
  }
  const send = (): void => {
    if (!model.canSend()) return

    const draft = { ...model.draft() }

    dialogs.open(() => (
      <BugReportConfirmation
        api={api}
        draft={draft}
        current={() => model.canSend() && JSON.stringify(draft) === JSON.stringify(model.draft())}
        onConfirm={() => {
          dialogs.back()
          void model.send(draft).then(() => {
            const result = model.result()

            if (api.lifecycle.signal?.aborted || !result || api.ui.dialog.open) return

            api.ui.toast({
              variant: result.status === 'created' ? 'success' : 'warning',
              title: 'Bug report',
              message: result.url ?? result.message,
              duration: 6000,
            })
          })
        }}
      />
    ))
  }
  const browse = async (): Promise<void> => {
    if (!model.canBrowse()) return

    const target = model.browser()

    if (copyLink()) {
      const copied = api.renderer.copyToClipboardOSC52(target.url)

      setNotice(copied ? 'Browser link copied.' : 'Clipboard unavailable. The full draft remains in the editor.')

      return
    }

    if (target.needsCopy && !api.renderer.copyToClipboardOSC52(target.copyText)) {
      setNotice('Clipboard unavailable. Shorten the report URL or copy the draft manually.')

      return
    }

    setCopyLink(!(await model.open(target.url)))
  }

  function browserLabel() {
    if (copyLink()) return 'Copy browser link'

    if (model.result()?.status === 'uncertain') return 'Check GitHub issues in browser'

    return model.browser().needsCopy ? 'Copy report & open browser' : 'Open in browser'
  }
  function maintenanceLabel() {
    const status = model.result()?.status

    if (status === 'uncertain') return 'Retry after checking GitHub'

    return status === 'created' || status === 'partial' ? 'New report' : 'Check GitHub CLI'
  }
  function maintain() {
    const status = model.result()?.status

    setNotice('')
    setCopyLink(false)

    if (status === 'uncertain') model.retryAfterReview()
    else if (status === 'created' || status === 'partial') {
      model.newReport()
      body?.setText(model.draft().body)
      setCursor(0)
      focus(0)
    } else void model.probe(true)
  }
  const options = createMemo<ReportAction[]>(() => [
    { label: model.busy() ? 'Sending…' : 'Send to GitHub…', icon: 'export', disabled: !model.canSend(), run: send },
    { label: browserLabel(), icon: 'right', disabled: !model.canBrowse(), run: () => void browse() },
    {
      label: maintenanceLabel(),
      icon: 'retry',
      disabled: model.busy() || model.readiness().status === 'checking',
      run: maintain,
    },
    { label: model.busy() ? 'Back (sending continues)' : 'Cancel', icon: 'close', disabled: false, run: dialogs.back },
  ])

  function activate(index: number) {
    const option = options()[index]

    if (option && !option.disabled) option.run()
  }

  registerBugReportNavigation({ api, active, focus, activate, send })
  onMount(() => {
    void model.probe()
    queueMicrotask(() => focus(active()))
  })

  return {
    dialogs,
    options,
    setHovered,
    setCursor,
    status: () => notice() || model.result()?.message || model.message() || model.readiness().message,
    selected: (index: number) => (hovered() ?? active() - 2) === index,
    activate(index: number) {
      focus(index + 2)
      activate(index)
    },
    editorFocus(index: number) {
      setActive(index)
      setHovered(undefined)
    },
    titleSubmit: () => focus(1),
    titleRef(node: InputRenderable) {
      title = node
    },
    bodyRef(node: TextareaRenderable) {
      body = node
      body.cursorOffset = cursor()
    },
    actionsRef(node: BoxRenderable) {
      actions = node
    },
  }
}
