import { expect, test } from 'bun:test'
import { pathToFileURL } from 'node:url'

test('Desktop harness releases inherited output pipes after the Electron process exits', async () => {
  const node = Bun.which('node')

  if (!node) throw new Error('The Desktop harness requires Node.js')

  const helper = pathToFileURL(`${process.cwd()}/test/gui/harness/cleanup.mjs`).href
  const source = `
    import assert from 'node:assert/strict';
    import { spawn } from 'node:child_process';
    import { once } from 'node:events';
    import { closeProcessPipes } from ${JSON.stringify(helper)};
    const program = "const { spawn } = require('node:child_process'); const daemon = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: ['ignore', 'inherit', 'inherit'] }); console.log(daemon.pid); daemon.unref();";
    const child = spawn(process.execPath, ['-e', program], { stdio: ['ignore', 'pipe', 'pipe'] });
    const exit = once(child, 'exit');
    let descendant;
    try {
      const [data] = await once(child.stdout, 'data');
      descendant = Number(data.toString().trim());
      assert(Number.isSafeInteger(descendant) && descendant > 0);
      await exit;
      assert.equal(child.exitCode, 0);
      assert.equal(child.stdout.readableEnded, false);
      assert.equal(child.stderr.readableEnded, false);
      closeProcessPipes(child);
      assert.equal(child.stdout.destroyed, true, 'stdout must be released even when a descendant retains its write end');
      assert.equal(child.stderr.destroyed, true, 'stderr must be released even when a descendant retains its write end');
      console.log('Inherited pipes reproduced and released');
    } finally {
      child.stdout.destroy();
      child.stderr.destroy();
      if (descendant) process.kill(descendant, 'SIGTERM');
    }
  `
  const child = Bun.spawn([node, '--input-type=module', '--eval', source], {
    stdout: 'pipe',
    stderr: 'pipe',
    signal: AbortSignal.timeout(5000),
  })
  const [code, output, error] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])

  expect(error).toBe('')
  expect(code).toBe(0)
  expect(output).toContain('Inherited pipes reproduced and released')
}, 10_000)
