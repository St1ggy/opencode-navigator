import { createSignal } from 'solid-js'

import { BUG_REPORT_BASE, bugReportBrowserTarget, openExternalUrl } from './bug-report-browser'
import { initialBugReport, validBugReport } from './bug-report-draft'
import { createGitHubBugReportTransport } from './github-bug-report'

import type { BugReportDraft, BugReportEnvironment } from './bug-report-draft'
import type { BugReportResult, BugReportTransport, GitHubReadiness } from './github-bug-report'

export function createBugReportController(
  environment: BugReportEnvironment,
  transport: BugReportTransport = createGitHubBugReportTransport(openExternalUrl),
  signal?: AbortSignal,
) {
  const [draft, setDraft] = createSignal(initialBugReport(environment))
  const [readiness, setReadiness] = createSignal<GitHubReadiness>({
    status: 'checking',
    message: 'Checking GitHub CLI…',
  })
  const [busy, setBusy] = createSignal(false)
  const [result, setResult] = createSignal<BugReportResult>()
  const [message, setMessage] = createSignal('')
  let probing: Promise<void> | undefined
  let checked = false
  const locked = () => busy() || (result() && result()!.status !== 'failed')

  function probe(force = false) {
    if (probing) return probing

    if (checked && !force) return Promise.resolve()

    setReadiness({ status: 'checking', message: 'Checking GitHub CLI…' })
    probing = transport
      .probe(signal)
      .then(setReadiness)
      .catch(() => setReadiness({ status: 'missing', message: 'Could not check gh. The browser remains available.' }))
      .then(() => {
        checked = true
      })
      .finally(() => {
        probing = undefined
      })

    return probing
  }

  return {
    draft,
    readiness,
    busy,
    result,
    message,
    probe,
    change(value: Partial<BugReportDraft>) {
      setDraft((previous) => ({ ...previous, ...value }))
    },
    canSend: () => readiness().status === 'ready' && validBugReport(draft()) && !locked(),
    canBrowse: () => result()?.status === 'uncertain' || Boolean(result()?.url) || validBugReport(draft()),
    browser: () => {
      if (result()?.url) return { url: result()!.url!, needsCopy: false, copyText: '' }

      if (result()?.status === 'uncertain') return { url: BUG_REPORT_BASE, needsCopy: false, copyText: '' }

      return bugReportBrowserTarget(draft())
    },
    retryAfterReview() {
      if (busy() || result()?.status !== 'uncertain') return

      setResult(undefined)
      setMessage('Review your report, then confirm another send.')
    },
    newReport() {
      if (busy()) return

      setResult(undefined)
      setMessage('')
      setDraft(initialBugReport(environment))
    },
    async send(confirmed: BugReportDraft) {
      if (
        readiness().status !== 'ready' ||
        !validBugReport(confirmed) ||
        locked() ||
        JSON.stringify(confirmed) !== JSON.stringify(draft())
      )
        return

      setBusy(true)
      setResult(undefined)
      setMessage('Sending your Bug report…')
      try {
        setResult(await transport.send({ ...confirmed }, signal))
      } catch {
        setResult({ status: 'uncertain', message: 'Outcome unknown. Check GitHub before sending again.' })
      } finally {
        setBusy(false)
      }
    },
    async open(url: string) {
      if (url !== BUG_REPORT_BASE && !url.startsWith(`${BUG_REPORT_BASE}/`)) return false

      try {
        const opened = await transport.open(url, signal)

        setMessage(opened ? 'Opened in your browser.' : `Browser unavailable. Copy this URL: ${url}`)

        return opened
      } catch {
        setMessage(`Browser unavailable. Copy this URL: ${url}`)

        return false
      }
    },
  }
}

export type BugReportController = ReturnType<typeof createBugReportController>
