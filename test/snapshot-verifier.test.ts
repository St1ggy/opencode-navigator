import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const { snapshotVerifier } = await import(new URL('../scripts/snapshot-verifier.mjs', import.meta.url).href)

test('snapshot verifier honors published runtime minima without changing dependencies or the live installation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'navigator-verifier-'))

  try {
    await mkdir(join(directory, 'dist'))
    expect(await snapshotVerifier(directory, async () => '')).toBe('node')
    await writeFile(
      join(directory, 'dist', 'runtime-requirements.json'),
      JSON.stringify({ version: 1, bun: '1.3.14', node: '26.4.0' }),
    )
    expect(await snapshotVerifier(directory, async (name: string) => (name === 'bun' ? '1.4.4' : 'v24.22.1'))).toBe(
      'bun',
    )
    expect(await snapshotVerifier(directory, async (name: string) => (name === 'bun' ? '' : 'v26.12.1'))).toBe('node')
    await expect(
      snapshotVerifier(directory, async (name: string) => (name === 'node' ? 'v24.22.1' : '')),
    ).rejects.toThrow('installed snapshot was preserved')
    await expect(
      snapshotVerifier(directory, async () => {
        throw new Error('missing')
      }),
    ).rejects.toThrow('requires Bun')
    await writeFile(
      join(directory, 'dist', 'runtime-requirements.json'),
      JSON.stringify({ version: 1, bun: 'bad', node: '26.4.0' }),
    )
    await expect(snapshotVerifier(directory, async () => '99.0.0')).rejects.toThrow('invalid runtime requirements')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
