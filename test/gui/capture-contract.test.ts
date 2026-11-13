import { expect, test } from 'bun:test'

test('reviewed capture inventory includes every Code Mode scene emitted by the harness', async () => {
  const harness = await Bun.file('test/gui/harness/code-mode.mjs').text()
  const manifest = await Bun.file('scripts/capture-gui-screenshots.mjs').text()
  const scenes = [...harness.matchAll(/captureGui\((?:details|routing|dialog),\s*'([^']+)'\)/gu)].map(
    (match) => match[1],
  )

  expect(scenes).toHaveLength(3)
  for (const scene of scenes) expect(manifest).toContain(`'${scene}'`)
})

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

test('capture settling keeps exact bytes and rejects an unstable frame instead of tolerating differences', async () => {
  // Byte buffers only: this contract never opens a browser or takes a screenshot.
  const source = `import assert from 'node:assert/strict';
    const { stableFrame, captureArguments } = await import('./test/gui/harness/capture.mjs');
    assert.deepEqual(captureArguments(), []);
    const frames = [Buffer.from('first'), Buffer.from('settled'), Buffer.from('settled')];
    let calls = 0;
    const frame = await stableFrame(async () => frames[calls++]);
    assert.equal(frame.toString(), 'settled');
    assert.equal(calls, 3);
    let changed = 0;
    await assert.rejects(stableFrame(async () => Buffer.from(String(++changed))), /two byte-identical frames/);
    assert.equal(changed, 4);
    console.log('Exact-byte settling verified');`
  const child = Bun.spawn([process.execPath, '--eval', source], {
    env: { ...process.env, NAVIGATOR_GUI_CAPTURE: '0', GITHUB_ACTIONS: 'false' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [code, output, error] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])

  expect(code).toBe(0)
  expect(error).toBe('')
  expect(output).toContain('Exact-byte settling verified')
})

test('capture-only launch pins full software rasterization, color and scale without starting a browser', async () => {
  const source = `const { captureArguments } = await import('./test/gui/harness/capture.mjs'); console.log(JSON.stringify(captureArguments()));`
  const child = Bun.spawn([process.execPath, '--eval', source], {
    env: { ...process.env, NAVIGATOR_GUI_CAPTURE: '1', GITHUB_ACTIONS: 'false' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [code, output] = await Promise.all([child.exited, new Response(child.stdout).text()])

  expect(code).toBe(0)
  expect(JSON.parse(output)).toEqual([
    '--disable-gpu-rasterization',
    '--disable-partial-raster',
    '--force-device-scale-factor=1',
    '--force-color-profile=srgb',
  ])
})
