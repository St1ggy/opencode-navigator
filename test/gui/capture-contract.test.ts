import { expect, test } from 'bun:test'

test('manual capture driver rejects local invocation before building or capturing', async () => {
  // Exercise only the refusal path; no Docker, renderer or screenshot is started.
  const child = Bun.spawn([process.execPath, 'scripts/capture-gui-screenshots.mjs'], {
    env: { ...process.env, GITHUB_ACTIONS: 'false' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [code, error] = await Promise.all([child.exited, new Response(child.stderr).text()])

  expect(code).not.toBe(0)
  expect(error).toContain('GUI screenshots run only in manual Prepare Release CI')
})

test('renderer capture helper cannot call screenshot outside the manual CI environment', async () => {
  const source = `const { captureGui } = await import('./test/gui/harness/capture.mjs');
    await captureGui({ screenshot() { throw new Error('A screenshot was attempted') } }, 'synthetic');`
  const child = Bun.spawn([process.execPath, '--eval', source], {
    env: { ...process.env, NAVIGATOR_GUI_CAPTURE: '1', GITHUB_ACTIONS: 'false' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [code, error] = await Promise.all([child.exited, new Response(child.stderr).text()])

  expect(code).not.toBe(0)
  expect(error).toContain('GUI captures are restricted to the manual CI workflow')
  expect(error).not.toContain('Error: A screenshot was attempted')
})
