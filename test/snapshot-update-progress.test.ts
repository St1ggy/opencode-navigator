import { expect, test } from 'bun:test'

import { runSnapshotUpdate } from '../src/app/snapshot-update-process'

test('snapshot update reports only its bounded stage protocol while the child is running', async () => {
  const stages: string[] = []
  const script = String.raw`process.stdout.write('unrelated output\nnavigator-update-progress:{"phase":"pre');
    setTimeout(() => { process.stdout.write('paring"}\nnavigator-update-progress:{"phase":"unsupported"}\n');
      setTimeout(() => { process.stdout.write('navigator-update-progress:{"phase":"downloading"}\n');
        setTimeout(() => process.exit(0), 30);
      }, 30);
    }, 30);`

  await runSnapshotUpdate([process.execPath, '--eval', script], (value) => stages.push(value.phase))
  expect(stages).toEqual(['preparing', 'downloading'])
})

test('snapshot update progress does not hide installer failures', async () => {
  const error = await runSnapshotUpdate(
    [process.execPath, '--eval', 'console.error("Synthetic install failure");process.exit(3)'],
    () => {},
  ).catch((error_: unknown) => error_)

  expect(error).toBeInstanceOf(Error)
  expect((error as Error).message).toContain('Synthetic install failure')
})
