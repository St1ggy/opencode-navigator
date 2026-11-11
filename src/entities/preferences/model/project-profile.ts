import { randomUUID } from 'node:crypto'
import { lstat, mkdir, readFile, realpath, rename, unlink, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { buildProjectProfile } from './project-profile-document'

const FILENAME = join('.opencode', 'navigator.json')

async function readProject(file: string): Promise<string | undefined> {
  const info = await lstat(file).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return

    throw error
  })

  if (info?.isSymbolicLink() || (info && !info.isFile())) throw new Error('Project settings must be a regular file')

  try {
    return await readFile(file, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return

    throw error
  }
}

export async function previewProjectProfile(root: string, nameInput: string, source: string, replace = false) {
  const directory = await realpath(resolve(root))
  const file = join(directory, FILENAME)
  const before = await readProject(file)

  return { ...buildProjectProfile(nameInput, source, before, replace), root: directory, file }
}

export async function saveProjectProfile(preview: Awaited<ReturnType<typeof previewProjectProfile>>, root: string) {
  if ((await realpath(resolve(root))) !== preview.root) throw new Error('Workspace changed; preview again')

  const configDirectory = join(preview.root, '.opencode')

  await mkdir(configDirectory, { recursive: true })
  const directoryInfo = await lstat(configDirectory)

  if (!directoryInfo.isDirectory() || directoryInfo.isSymbolicLink()) {
    throw new Error('Project configuration directory must not be a symlink')
  }

  if ((await readProject(preview.file)) !== preview.before) throw new Error('Project settings changed; preview again')

  const temporary = `${preview.file}.${randomUUID()}.tmp`

  try {
    await writeFile(temporary, preview.after, { flag: 'wx', mode: 0o600 })

    if ((await readProject(preview.file)) !== preview.before) throw new Error('Project settings changed; preview again')

    await rename(temporary, preview.file)
  } finally {
    await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error
    })
  }

  return preview.file
}
