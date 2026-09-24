import {
  type DesiredMcpStates,
  SIDEBAR_SECTIONS,
  type SectionLayoutDefault,
  type SidebarSection,
  parseSectionOrder,
} from '../../../shared/config'

export const PORTABLE_SETTINGS_FORMAT = 'opencode-navigator/settings'

export type PortableSettings = {
  format: typeof PORTABLE_SETTINGS_FORMAT
  version: 1
  layout?: SectionLayoutDefault
  mcp?: DesiredMcpStates
}

function object(value: unknown, path: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path} must be an object`)

  return value as Record<string, unknown>
}

function pointer(path: string, key: string) {
  return `${path}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`
}

function unknownKeys(input: Record<string, unknown>, allowed: readonly string[], path: string, output: string[]) {
  for (const key of Object.keys(input)) if (!allowed.includes(key)) output.push(pointer(path, key))
}

function parseVisibility(value: unknown, path: string, unsupported: string[]) {
  const input = object(value, path)

  return Object.fromEntries(
    Object.entries(input).flatMap(([name, visible]) => {
      if (!SIDEBAR_SECTIONS.includes(name as SidebarSection)) {
        unsupported.push(pointer(path, name))

        return []
      }

      if (typeof visible !== 'boolean') throw new Error(`${pointer(path, name)} must be a boolean`)

      return [[name, visible]]
    }),
  )
}

function parseLayout(value: unknown, unsupported: string[]): SectionLayoutDefault {
  const input = object(value, '/layout')

  unknownKeys(input, ['sections', 'expanded', 'order'], '/layout', unsupported)
  const sections = input.sections === undefined ? {} : parseVisibility(input.sections, '/layout/sections', unsupported)
  const expanded = input.expanded === undefined ? {} : parseVisibility(input.expanded, '/layout/expanded', unsupported)
  let order: SidebarSection[] | undefined

  if (input.order !== undefined) {
    if (!Array.isArray(input.order)) throw new Error('/layout/order must be an array')

    const supported: SidebarSection[] = []
    const seen = new Set<string>()

    for (const [index, name] of input.order.entries()) {
      if (typeof name !== 'string') throw new Error(`/layout/order/${index} must be a section name`)

      if (!SIDEBAR_SECTIONS.includes(name as SidebarSection)) unsupported.push(`/layout/order/${index}`)
      else if (seen.has(name)) throw new Error(`/layout/order/${index} duplicates ${name}`)
      else {
        seen.add(name)
        supported.push(name as SidebarSection)
      }
    }
    order = parseSectionOrder(supported)
  }

  return { sections, expanded, ...(order && { order }) }
}

function parseMcp(value: unknown): DesiredMcpStates {
  const input = object(value, '/mcp')

  return Object.fromEntries(
    Object.entries(input)
      .map(([name, state]) => {
        if (!name.trim()) throw new Error('/mcp contains an empty server name')

        if (state !== 'enabled' && state !== 'disabled') {
          throw new Error(`${pointer('/mcp', name)} must be enabled or disabled`)
        }

        return [name, state]
      })
      .sort(([left], [right]) => left.localeCompare(right)),
  )
}

export function parsePortableSettings(source: string) {
  let value: unknown

  try {
    value = JSON.parse(source)
  } catch (error) {
    throw new Error('Malformed settings JSON', { cause: error })
  }
  const input = object(value, 'Settings JSON')

  if (input.format !== PORTABLE_SETTINGS_FORMAT) throw new Error(`Expected format ${PORTABLE_SETTINGS_FORMAT}`)

  if (input.version !== 1) throw new Error(`Unsupported settings version ${String(input.version)}`)

  const unsupported: string[] = []

  unknownKeys(input, ['format', 'version', 'layout', 'mcp'], '', unsupported)
  const hasLayout = Object.hasOwn(input, 'layout')
  const hasMcp = Object.hasOwn(input, 'mcp')

  if (!hasLayout && !hasMcp) throw new Error('Settings JSON contains no supported settings')

  const settings = {
    format: PORTABLE_SETTINGS_FORMAT,
    version: 1,
    ...(hasLayout && { layout: parseLayout(input.layout, unsupported) }),
    ...(hasMcp && { mcp: parseMcp(input.mcp) }),
  } satisfies PortableSettings

  unsupported.sort()

  return { settings, unsupported }
}

export function serializePortableSettings(layout: SectionLayoutDefault, mcp: DesiredMcpStates) {
  return `${JSON.stringify(
    {
      format: PORTABLE_SETTINGS_FORMAT,
      version: 1,
      layout,
      mcp: Object.fromEntries(Object.entries(mcp).sort(([left], [right]) => left.localeCompare(right))),
    } satisfies PortableSettings,
    undefined,
    2,
  )}\n`
}
