import type { BugReportDraft } from './bug-report-draft'

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
