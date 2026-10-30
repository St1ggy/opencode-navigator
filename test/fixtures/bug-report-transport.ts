import type { BugReportDraft } from '../../src/features/sidebar-settings/model/bug-report-draft'
import type {
  BugReportResult,
  BugReportTransport,
  GitHubReadiness,
} from '../../src/features/sidebar-settings/model/github-bug-report'

export function bugReportTransportFixture() {
  const sent: BugReportDraft[] = []
  const opened: string[] = []
  let readiness: GitHubReadiness = { status: 'ready', message: 'Ready through synthetic gh' }
  let response: BugReportResult = {
    status: 'created',
    message: 'Bug report created.',
    url: 'https://github.com/St1ggy/opencode-navigator/issues/123',
  }
  let openResult = true
  const transport: BugReportTransport = {
    probe: async () => readiness,
    send: async (draft) => {
      sent.push({ ...draft })

      return response
    },
    open: async (url) => {
      opened.push(url)

      return openResult
    },
  }

  return {
    transport,
    sent,
    opened,
    readiness(value: GitHubReadiness) {
      readiness = value
    },
    response(value: BugReportResult) {
      response = value
    },
    browser(value: boolean) {
      openResult = value
    },
  }
}
