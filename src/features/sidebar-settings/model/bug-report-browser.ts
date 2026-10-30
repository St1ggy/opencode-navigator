import type { BugReportDraft } from './bug-report-draft'

export const BUG_REPORT_REPOSITORY = 'St1ggy/opencode-navigator'
export const BUG_REPORT_BASE = `https://github.com/${BUG_REPORT_REPOSITORY}/issues`

export function bugReportBrowserTarget(draft: BugReportDraft) {
  const target = new URL(`${BUG_REPORT_BASE}/new`)

  target.searchParams.set('template', 'bug_report.yml')
  target.searchParams.set('title', draft.title)
  target.searchParams.set('report', draft.body)
  const needsCopy = target.href.length > 7000

  if (needsCopy) target.searchParams.delete('report')

  const copyTitle = target.href.length > 7000

  if (copyTitle) target.searchParams.delete('title')

  return { url: target.href, needsCopy, copyText: copyTitle ? `${draft.title}\n\n${draft.body}` : draft.body }
}

export { openExternalUrl } from '../../../shared/lib/external-url'
