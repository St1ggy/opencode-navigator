import { parseConfiguredDefaults } from './configured-defaults'
import { parsePortableSettings } from './portable-settings'
import { parseSectionLayout } from './schema'

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

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Project settings must be an object')

  return value as Record<string, unknown>
}

export function buildProjectProfile(nameInput: string, source: string, before?: string, replace = false) {
  const name = nameInput.trim()

  if (!name || name.length > 64) throw new Error('Profile names must contain 1–64 characters')

  if (name.includes('/') || name.includes('\\') || name.startsWith('~'))
    throw new Error('Profile names must not contain private paths')

  const parsed = parsePortableSettings(source)
  const layout = parsed.settings.layout && parseSectionLayout(parsed.settings.layout)

  if (!layout) throw new Error('A project profile needs a layout')

  const servers = Object.keys(parsed.settings.mcp ?? {})

  for (const server of servers) {
    if (server.includes('/') || server.includes('\\') || server.startsWith('~'))
      throw new Error(`MCP server name looks like a private path: ${server}`)
  }

  const existing = before === undefined ? {} : object(JSON.parse(before) as unknown)

  for (const key of Object.keys(existing)) {
    if (PRIVATE_KEYS.has(key)) throw new Error(`Project settings contain private field ${key}`)
  }

  parseConfiguredDefaults(existing)
  const layouts = object(existing.layoutPresets ?? {})
  const mcpPresets = object(existing.mcpPresets ?? {})
  const profiles = object(existing.workspaceProfiles ?? {})
  const collision = Object.keys(layouts).find((candidate) => candidate.toLocaleLowerCase() === name.toLocaleLowerCase())

  if (collision && (!replace || collision !== name)) throw new Error(`Project profile already exists: ${collision}`)

  if (!collision && Object.keys(layouts).length >= 50) throw new Error('Project profiles are full')

  const hasMcp = Boolean(parsed.settings.mcp && servers.length > 0)

  if (hasMcp && !replace && mcpPresets[name]) throw new Error(`Project MCP preset already exists: ${name}`)

  if (
    hasMcp &&
    mcpPresets[name] &&
    Object.entries(profiles).some(([layoutName, mcpName]) => layoutName !== name && mcpName === name)
  )
    throw new Error(`MCP preset ${name} is linked to another project profile`)

  const next: Record<string, unknown> = {
    ...existing,
    layoutPresets: { ...layouts, [name]: layout },
    ...(hasMcp && {
      mcpPresets: { ...mcpPresets, [name]: parsed.settings.mcp },
      workspaceProfiles: { ...profiles, [name]: name },
    }),
  }

  if (!hasMcp && profiles[name] && replace)
    next.workspaceProfiles = Object.fromEntries(Object.entries(profiles).filter(([key]) => key !== name))

  parseConfiguredDefaults(next)

  return {
    name,
    before,
    after: `${JSON.stringify(next, undefined, 2)}\n`,
    layout,
    mcp: parsed.settings.mcp,
    skipped: parsed.unsupported,
  }
}
