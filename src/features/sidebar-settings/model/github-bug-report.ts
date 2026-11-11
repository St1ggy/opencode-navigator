import { runProcessCommand } from '../../../shared/lib/process-command'

import { createGitHubBugReportTransport as createTransport } from './github-transport'

import type { BugReportTransport } from './bug-report-contracts'
import type { GitHubCommandRunner } from './github-transport'

export type { GitHubReadiness, BugReportResult, BugReportTransport } from './bug-report-contracts'

const runGitHubCommand: GitHubCommandRunner = (command, input, signal) =>
  runProcessCommand(command, input, signal, 15_000, {
    GH_PROMPT_DISABLED: '1',
    GH_HOST: 'github.com',
    GH_PAGER: 'cat',
  })

export function createGitHubBugReportTransport(
  open: BugReportTransport['open'],
  run: GitHubCommandRunner = runGitHubCommand,
) {
  return createTransport(open, run)
}
