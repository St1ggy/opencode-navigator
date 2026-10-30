import { expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'

import metadata from '../package.json'
import { bugReportBrowserTarget } from '../src/features/sidebar-settings/model/bug-report-browser'
import { createBugReportController } from '../src/features/sidebar-settings/model/bug-report-controller'
import { createGitHubBugReportTransport } from '../src/features/sidebar-settings/model/github-bug-report'

import { bugReportTransportFixture } from './fixtures/bug-report-transport'

const environment = {
  navigatorVersion: metadata.version,
  openCodeVersion: metadata.devDependencies['@opencode/plugin'],
  platform: 'synthetic',
  runtime: 'synthetic',
}

test('reports use argv/stdin and the native Bug type, without reading or retaining credentials', async () => {
  const commands: { command: readonly string[]; input?: string }[] = []
  const transport = createGitHubBugReportTransport(
    async () => true,
    async (command, input) => {
      commands.push({ command, input })

      return {
        code: 0,
        stdout: command.includes('--help') ? '--type' : 'https://github.com/St1ggy/opencode-navigator/issues/123\n',
      }
    },
  )
  const report = { title: 'Quotes " and $(commands) stay literal', body: 'Synthetic details\nwith multiple lines' }

  expect((await transport.probe()).status).toBe('ready')
  expect((await transport.send(report)).status).toBe('created')
  expect(commands.at(-1)?.command).toEqual([
    'gh',
    'issue',
    'create',
    '--repo',
    'github.com/St1ggy/opencode-navigator',
    '--type',
    'Bug',
    `--title=${report.title}`,
    '--body-file',
    '-',
  ])
  expect(commands.at(-1)?.input).toBe(report.body)
  expect(commands.some((call) => call.command.includes('--show-token'))).toBe(false)
})

test('controller retains drafts, rejects stale confirmations, and prevents resubmission after uncertain outcomes', async () => {
  const h = bugReportTransportFixture()
  const report = createBugReportController(environment, h.transport)

  await report.probe()
  report.change({ title: 'Synthetic bug', body: 'Steps and details' })
  const confirmed = { ...report.draft() }

  report.change({ title: 'Edited after preview' })
  await report.send(confirmed)
  expect(h.sent).toEqual([])
  h.response({ status: 'uncertain', message: 'Check GitHub first' })
  await report.send(report.draft())
  await report.send(report.draft())
  expect(h.sent).toHaveLength(1)
  expect(report.canSend()).toBe(false)
  expect(report.draft().body).toBe('Steps and details')
  expect(report.canBrowse()).toBe(true)
  expect(report.browser().url).toBe('https://github.com/St1ggy/opencode-navigator/issues')
  report.retryAfterReview()
  expect(report.canSend()).toBe(true)
})

test.each(['missing', 'unauthenticated', 'unsupported'] as const)(
  'the browser remains available when gh is %s',
  async (status) => {
    const h = bugReportTransportFixture()

    h.readiness({ status, message: 'Synthetic CLI requirement' })
    const report = createBugReportController(environment, h.transport)

    report.change({ title: 'Synthetic bug' })
    await report.probe()
    expect(report.canSend()).toBe(false)
    expect(report.canBrowse()).toBe(true)
    const url = new URL(report.browser().url)

    expect(url.searchParams.get('template')).toBe('bug_report.yml')
    expect(url.searchParams.get('report')).toBe(report.draft().body)
    expect(report.draft().body).not.toMatch(/session|workspace|token|\/Users\//i)
  },
)

test('partial success and timeouts never become an automatic duplicate issue', async () => {
  const partial = createGitHubBugReportTransport(
    async () => true,
    async () => ({ code: 1, stdout: 'https://github.com/St1ggy/opencode-navigator/issues/456\n' }),
  )
  const timeout = createGitHubBugReportTransport(
    async () => true,
    async () => ({ code: -1, stdout: '', timedOut: true }),
  )

  expect((await partial.send({ title: 'Bug', body: 'Details' })).status).toBe('partial')
  expect((await timeout.send({ title: 'Bug', body: 'Details' })).status).toBe('uncertain')
})

test('browser issue form has the native Bug type and long reports retain the complete draft for explicit copying', async () => {
  const body = 'Synthetic detail '.repeat(1500)
  const target = bugReportBrowserTarget({ title: 'Long report', body })
  const template = await readFile(new URL('../.github/ISSUE_TEMPLATE/bug_report.yml', import.meta.url), 'utf8')

  expect(target.needsCopy).toBe(true)
  expect(target.copyText).toBe(body)
  expect(new URL(target.url).searchParams.has('report')).toBe(false)
  expect(template).toContain('type: Bug')
  expect(template).toContain('id: report')
})

test('a pending send is coalesced and a failed creation can be retried explicitly without losing edits', async () => {
  const h = bugReportTransportFixture()
  let finish!: (value: { status: 'failed'; message: string }) => void

  h.transport.send = async (draft) => {
    h.sent.push(draft)

    return new Promise((resolve) => {
      finish = resolve
    })
  }
  const report = createBugReportController(environment, h.transport)

  report.change({ title: 'Synthetic bug', body: 'Unsent details' })
  await report.probe()
  const sending = report.send(report.draft())

  await report.send(report.draft())
  expect(h.sent).toHaveLength(1)
  expect(report.busy()).toBe(true)
  finish({ status: 'failed', message: 'Synthetic refusal before creation' })
  await sending
  expect(report.canSend()).toBe(true)
  expect(report.draft().body).toBe('Unsent details')
})

test('unknown CLI errors require reviewing GitHub and a huge title never produces an oversized browser URL', async () => {
  const transport = createGitHubBugReportTransport(
    async () => true,
    async () => ({ code: 1, stdout: '' }),
  )

  expect((await transport.send({ title: 'Bug', body: 'Details' })).status).toBe('uncertain')
  const draft = { title: 'Long title '.repeat(2000), body: 'Complete body' }
  const target = bugReportBrowserTarget(draft)

  expect(target.url.length).toBeLessThan(7000)
  expect(target.copyText).toContain(draft.title)
  expect(target.copyText).toContain(draft.body)
})
