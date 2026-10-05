import { randomUUID } from 'node:crypto'
import { lstat, mkdir, readFile, realpath, rename, unlink, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { parseConfiguredDefaults } from './configured-defaults'
import { parsePortableSettings } from './portable-settings'
import { parseSectionLayout } from './schema'

const FILENAME = join('.opencode', 'navigator.json')
const PRIVATE_KEYS = new Set([
  'favoriteSkills',
  'favoriteMcpServers',
  'favoriteQuickActions',
  'skillGroups',
  'recentSkills',
  'recentQuickActions',
  'skippedSkillConfirmations',
  'onboardingCompleted',
  'codexAccountBindings',
  'pendingResetAttempt',
  'lastNavigatorVersion',
  'previousNavigatorVersion',
  'worktrees',
  'user',
])

type Document = Record<string, unknown>

function object(value: unknown): Document {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Project settings must be an object')

  return value as Document
}

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

function parseProject(source: string | undefined): Document {
  if (source === undefined) return {}

  const input = object(JSON.parse(source) as unknown)

  const keys = Object.keys(input)

  for (const key of keys) {
    if (PRIVATE_KEYS.has(key)) throw new Error(`Project settings contain private field ${key}`)
  }

  parseConfiguredDefaults(input)

  return input
}

export async function previewProjectProfile(root: string, nameInput: string, source: string, replace = false) {
  const directory = await realpath(resolve(root))
  const name = nameInput.trim()

  if (!name || name.length > 64) throw new Error('Profile names must contain 1–64 characters')

  if (name.includes('/') || name.includes('\\') || name.startsWith('~')) {
    throw new Error('Profile names must not contain private paths')
  }

  const parsed = parsePortableSettings(source)
  const layout = parsed.settings.layout && parseSectionLayout(parsed.settings.layout)

  if (!layout) throw new Error('A project profile needs a layout')

  const servers = Object.keys(parsed.settings.mcp ?? {})

  for (const server of servers) {
    if (server.includes('/') || server.includes('\\') || server.startsWith('~')) {
      throw new Error(`MCP server name looks like a private path: ${server}`)
    }
  }
  const file = join(directory, FILENAME)
  const before = await readProject(file)
  const existing = parseProject(before)
  const layouts = object(existing.layoutPresets ?? {})
  const mcpPresets = object(existing.mcpPresets ?? {})
  const profiles = object(existing.workspaceProfiles ?? {})
  const collision = Object.keys(layouts).find((candidate) => candidate.toLocaleLowerCase() === name.toLocaleLowerCase())

  if (collision && (!replace || collision !== name)) throw new Error(`Project profile already exists: ${collision}`)

  if (!collision && Object.keys(layouts).length >= 50) throw new Error('Project profiles are full')

  const hasMcp = Boolean(parsed.settings.mcp && servers.length > 0)

  if (hasMcp && !replace && mcpPresets[name]) {
    throw new Error(`Project MCP preset already exists: ${name}`)
  }

  if (
    hasMcp &&
    mcpPresets[name] &&
    Object.entries(profiles).some(([layoutName, mcpName]) => layoutName !== name && mcpName === name)
  ) {
    throw new Error(`MCP preset ${name} is linked to another project profile`)
  }

  const next: Document = {
    ...existing,
    layoutPresets: { ...layouts, [name]: layout },
    ...(hasMcp && {
      mcpPresets: { ...mcpPresets, [name]: parsed.settings.mcp },
      workspaceProfiles: { ...profiles, [name]: name },
    }),
  }

  if (!hasMcp && profiles[name] && replace) {
    next.workspaceProfiles = Object.fromEntries(Object.entries(profiles).filter(([key]) => key !== name))
  }

  parseConfiguredDefaults(next)

  return {
    root: directory,
    file,
    name,
    before,
    after: `${JSON.stringify(next, undefined, 2)}\n`,
    layout,
    mcp: parsed.settings.mcp,
    skipped: parsed.unsupported,
  }
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
