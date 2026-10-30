import { expect, test } from 'bun:test'

import { runProcessCommand } from '../src/shared/lib/process-command'

test('report command transport carries multiline stdin without a shell and settles deadlines/abort', async () => {
  const value = 'Synthetic report\n$(not a command) & quotes " remain data'
  const result = await runProcessCommand(
    [process.execPath, '--eval', 'process.stdout.write(await Bun.stdin.text())'],
    value,
  )

  expect(result.code).toBe(0)
  expect(result.stdout).toBe(value)
  const deadline = await runProcessCommand([process.execPath, '--eval', 'await Bun.sleep(60000)'], '', undefined, 100)

  expect(deadline.timedOut).toBe(true)
  const controller = new AbortController()

  controller.abort()
  expect((await runProcessCommand(['not-a-real-program'], '', controller.signal)).timedOut).toBe(true)
})
