import { expect, test } from 'bun:test'

import { createMainBugReport } from '../../src/app/gui/adapters/main-bug-report'
import { runNodeCommand } from '../../src/app/gui/adapters/node-command'

const caller = (window = 1) => ({ window, signal: new AbortController().signal })
const draft = { title: 'Synthetic report', body: 'Synthetic steps, no chat, files or logs.' }

test('Desktop report transport binds the reviewed draft to its window and sends a Bug once', async () => {
  const commands: { args: readonly string[]; input?: string }[] = []
  const service = createMainBugReport(new AbortController().signal, async (args, input) => {
    commands.push({ args, input })

    return {
      code: 0,
      stdout: args.includes('--body-file') ? 'https://github.com/St1ggy/opencode-navigator/issues/123\n' : '--type',
    }
  })
  const token = await service.prepare(draft, caller())

  expect(commands).toEqual([])
  await expect(service.send({ token, draft }, caller(2))).rejects.toThrow('confirmation changed')
  await expect(service.send({ token, draft: { ...draft, body: 'changed' } }, caller())).rejects.toThrow(
    'confirmation changed',
  )
  const [first, second] = await Promise.all([
    service.send({ token, draft }, caller()),
    service.send({ token, draft }, caller()),
  ])

  expect(first.status).toBe('created')
  expect(second).toEqual(first)
  expect(commands.filter((command) => command.args.includes('--body-file'))).toEqual([
    {
      args: [
        'gh',
        'issue',
        'create',
        '--repo',
        'github.com/St1ggy/opencode-navigator',
        '--type',
        'Bug',
        '--title=Synthetic report',
        '--body-file',
        '-',
      ],
      input: draft.body,
    },
  ])
})

test('Desktop reporting leaves unauthenticated gh untouched and retains uncertain results', async () => {
  const unauthenticated = createMainBugReport(new AbortController().signal, async () => ({ code: 4, stdout: '' }))

  expect((await unauthenticated.probe(undefined, caller())).status).toBe('missing')
  let sends = 0
  const service = createMainBugReport(new AbortController().signal, async (args) => {
    if (!args.includes('--body-file')) return { code: 0, stdout: '--type' }

    sends++

    return { code: -1, stdout: '', timedOut: true }
  })
  const token = await service.prepare(draft, caller())

  expect((await service.send({ token, draft }, caller())).status).toBe('uncertain')
  expect((await service.send({ token, draft }, caller())).status).toBe('uncertain')
  expect(sends).toBe(1)
})

test('Desktop command runner uses literal argv and stdin without a shell', async () => {
  const result = await runNodeCommand(
    ['node', '-e', 'process.stdin.on("data", value => process.stdout.write(value));'],
    'literal $(not-a-command)',
  )

  expect(result).toEqual({ code: 0, stdout: 'literal $(not-a-command)' })
  const aborted = new AbortController()

  aborted.abort()
  expect(await runNodeCommand(['/synthetic/not-executed'], '', aborted.signal)).toMatchObject({
    code: -1,
    timedOut: true,
  })
})
