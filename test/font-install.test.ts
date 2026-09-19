import { expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const installer = fileURLToPath(new URL('../scripts/install-font.mjs', import.meta.url))
const font = new URL('../assets/OpenCodeNavigatorCorners.ttf', import.meta.url)

test('font installer works outside the package directory and only replaces its own font', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'navigator-font-'))
  const destination = join(directory, 'OpenCodeNavigatorCorners.ttf')
  const otherFont = join(directory, 'UserFont.ttf')
  const run = async (...args: string[]) => {
    const child = Bun.spawn([process.execPath, installer, '--directory', directory, ...args], {
      cwd: directory,
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const [code, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])

    return { code, stdout, stderr }
  }

  try {
    await Bun.write(otherFont, 'existing user font')
    const help = await run('--help')

    expect(help.code).toBe(0)
    expect(help.stdout).toContain('Usage:')
    expect(await Bun.file(destination).exists()).toBe(false)
    const installed = await run()

    expect(installed.code, installed.stderr).toBe(0)
    expect(installed.stdout).toContain('Installed')
    expect(await Bun.file(destination).arrayBuffer()).toEqual(await Bun.file(font).arrayBuffer())
    const failed = await run('--source', join(directory, 'missing.ttf'))

    expect(failed.code).not.toBe(0)
    expect(await Bun.file(destination).arrayBuffer()).toEqual(await Bun.file(font).arrayBuffer())
    const removed = await run('--uninstall')

    expect(removed.code, removed.stderr).toBe(0)
    expect(await Bun.file(destination).exists()).toBe(false)
    expect(await Bun.file(otherFont).text()).toBe('existing user font')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
