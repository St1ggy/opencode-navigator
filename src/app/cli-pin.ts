import { randomUUID } from 'node:crypto'
import { readFile, realpath, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { pluginPinEdit } from './plugin-pin'

export async function advanceCliPin(
  target: string,
  version: string,
  path = join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'opencode', 'cli.json'),
  valid: () => boolean = () => true,
) {
  if (process.env.OPENCODE_CLI_CONFIG_CONTENT !== undefined)
    throw new Error('Inline CLI configuration is active; update its Navigator pin explicitly')

  let resolved: string

  try {
    resolved = await realpath(path)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false

    throw error
  }

  const original = await readFile(resolved, 'utf8')
  const next = pluginPinEdit(original, target, version)

  if (!next) return false

  const temporary = `${resolved}.navigator-${randomUUID()}`
  const metadata = await stat(resolved)
  const mode = metadata.mode

  try {
    await writeFile(temporary, next, { flag: 'wx', mode })

    if ((await readFile(resolved, 'utf8')) !== original || (await realpath(path)) !== resolved || !valid())
      throw new Error('CLI configuration changed; check again before updating')

    await rename(temporary, resolved)

    if ((await readFile(resolved, 'utf8')) !== next)
      throw new Error('Could not verify the Navigator configuration update')
  } finally {
    await unlink(temporary).catch(() => {})
  }

  return true
}
