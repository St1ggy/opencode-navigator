export type BugReportDraft = { title: string; body: string }
export type BugReportEnvironment = {
  navigatorVersion: string
  openCodeVersion: string
  platform: string
  runtime: string
}

export function initialBugReport(environment: BugReportEnvironment): BugReportDraft {
  return {
    title: '',
    body: `## What happened\n\n## Steps to reproduce\n\n## Expected behavior\n\n## Environment\n- Navigator: ${environment.navigatorVersion}\n- OpenCode: ${environment.openCodeVersion}\n- Platform: ${environment.platform}\n- Runtime: ${environment.runtime}\n`,
  }
}

export function validBugReport(draft: BugReportDraft) {
  return Boolean(draft.title.trim() && draft.body.trim())
}
