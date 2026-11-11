import { openExternalUrl } from '../../../shared/lib/external-url'

import { createBugReportModel } from './bug-report-model'
import { createGitHubBugReportTransport } from './github-bug-report'

import type { BugReportTransport } from './bug-report-contracts'
import type { BugReportEnvironment } from './bug-report-draft'

export function createBugReportController(
  environment: BugReportEnvironment,
  transport: BugReportTransport = createGitHubBugReportTransport(openExternalUrl),
  signal?: AbortSignal,
) {
  return createBugReportModel(environment, transport, signal)
}

export type { BugReportController } from './bug-report-model'
