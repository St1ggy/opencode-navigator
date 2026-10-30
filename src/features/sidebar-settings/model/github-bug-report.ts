import { runProcessCommand } from '../../../shared/lib/process-command'

import { BUG_REPORT_REPOSITORY } from './bug-report-browser'

import type { BugReportDraft } from './bug-report-draft'
import type { CommandResult } from '../../../shared/lib/process-command'

export type GitHubReadiness = {
  status: 'checking' | 'ready' | 'missing' | 'unauthenticated' | 'unsupported'
  message: string
}
export type BugReportResult = { status: 'created' | 'partial' | 'failed' | 'uncertain'; message: string; url?: string }
export type BugReportTransport = {
  probe(signal?: AbortSignal): Promise<GitHubReadiness>
  send(draft: BugReportDraft, signal?: AbortSignal): Promise<BugReportResult>
  open(url: string, signal?: AbortSignal): Promise<boolean>
}

function runGitHubCommand(command: readonly string[], input?: string, signal?: AbortSignal) {
  return runProcessCommand(command, input, signal, 15_000, {
    GH_PROMPT_DISABLED: '1',
    GH_HOST: 'github.com',
    GH_PAGER: 'cat',
  })
}

export function createGitHubBugReportTransport(
  open: BugReportTransport['open'],
  run: (command: readonly string[], input?: string, signal?: AbortSignal) => Promise<CommandResult> = runGitHubCommand,
): BugReportTransport {
  return {
    open,
    async probe(signal) {
      const version = await run(['gh', '--version'], '', signal)

      if (version.code !== 0)
        return { status: 'missing', message: 'Install GitHub CLI for direct sending, or open the browser.' }

      const auth = await run(['gh', 'auth', 'status', '--active', '--hostname', 'github.com'], '', signal)

      if (auth.code !== 0)
        return { status: 'unauthenticated', message: 'Sign in with gh auth login, or open the browser.' }

      const help = await run(['gh', 'issue', 'create', '--help'], '', signal)

      return help.code === 0 && help.stdout.includes('--type')
        ? { status: 'ready', message: 'Ready to send through your authenticated GitHub CLI.' }
        : { status: 'unsupported', message: 'Update gh to support the Bug issue type, or use the browser.' }
    },
    async send(draft, signal) {
      const result = await run(
        [
          'gh',
          'issue',
          'create',
          '--repo',
          `github.com/${BUG_REPORT_REPOSITORY}`,
          '--type',
          'Bug',
          `--title=${draft.title.trim()}`,
          '--body-file',
          '-',
        ],
        draft.body,
        signal,
      )
      const url = /^https:\/\/github\.com\/St1ggy\/opencode-navigator\/issues\/\d+\s*$/m.exec(result.stdout)?.[0].trim()

      if (url)
        return result.code === 0
          ? { status: 'created', message: 'Bug report created.', url }
          : { status: 'partial', message: 'Issue created; open it to review the Bug type.', url }

      if (result.timedOut || ![-1, 4, 127].includes(result.code))
        return { status: 'uncertain', message: 'Outcome unknown. Check GitHub before sending again.' }

      return { status: 'failed', message: 'Could not send. Check GitHub access, then retry.' }
    },
  }
}
