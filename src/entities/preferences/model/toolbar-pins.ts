import { QUICK_ACTION_IDS, type QuickActionId } from '../../../shared/config'

type PinIcons = {
  icon: string
  icons?: string[]
  text?: string
  stateIcons?: Record<string, string>
  stateIconLists?: Record<string, string[]>
}
export type ToolbarPin = PinIcons &
  ({ kind: 'action'; id: QuickActionId } | { kind: 'skill'; location: string; name: string })
export type ToolbarPinUpdate =
  | { operation: 'pin'; pin: ToolbarPin }
  | {
      operation: 'configure'
      key: string
      icon: string
      icons?: string[] | null
      text?: string | null
      stateIcons?: Record<string, string | null>
      stateIconLists?: Record<string, string[] | null>
      expected?: string
    }
  | { operation: 'remove'; key: string }
  | { operation: 'move'; key: string; before?: string }

export function toolbarPinKey(pin: ToolbarPin): string {
  return pin.kind === 'action' ? `action:${pin.id}` : `skill:${pin.location}`
}

function identifier(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z][a-z\d-]{0,47}$/u.test(value)
}

function iconList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 3 && value.every((item) => identifier(item))
}

export function validToolbarPinText(text: string): boolean {
  return (
    text.length <= 128 &&
    [...text].every((character) => {
      const point = character.codePointAt(0) ?? 0

      return point >= 32 && point !== 127 && point !== 8232 && point !== 8233
    })
  )
}

export function toolbarPinIcons(pin: ToolbarPin, state?: string): readonly string[] {
  if (state && pin.stateIconLists?.[state]) return pin.stateIconLists[state]

  if (state && pin.stateIcons?.[state]) return [pin.stateIcons[state]]

  return pin.icons ?? [pin.icon]
}

function parsePin(value: unknown): ToolbarPin | undefined {
  if (!value || typeof value !== 'object') return

  const input = value as Record<string, unknown>

  if (!identifier(input.icon)) return

  if (input.icons !== undefined && !iconList(input.icons)) return

  const text = typeof input.text === 'string' ? input.text.trim() : ''

  if (!validToolbarPinText(text)) return

  const stateIcons = Object.fromEntries(
    Object.entries(input.stateIcons && typeof input.stateIcons === 'object' ? input.stateIcons : {}).filter(
      ([key, icon]) => identifier(key) && identifier(icon),
    ),
  ) as Record<string, string>
  const stateIconLists = Object.fromEntries(
    Object.entries(input.stateIconLists && typeof input.stateIconLists === 'object' ? input.stateIconLists : {}).filter(
      ([key, entry]) => identifier(key) && iconList(entry),
    ),
  ) as Record<string, string[]>
  const base = input.icons as string[] | undefined

  if (!text && (base?.length === 0 || Object.values(stateIconLists).some((list) => list.length === 0))) return

  const icons = {
    icon: input.icon,
    ...(base && { icons: [...base] }),
    ...(text && { text }),
    ...(Object.keys(stateIcons).length > 0 && { stateIcons }),
    ...(Object.keys(stateIconLists).length > 0 && { stateIconLists }),
  }

  if (input.kind === 'action' && QUICK_ACTION_IDS.includes(input.id as QuickActionId))
    return { kind: 'action', id: input.id as QuickActionId, ...icons }

  if (
    input.kind === 'skill' &&
    typeof input.location === 'string' &&
    input.location.trim() &&
    typeof input.name === 'string' &&
    input.name.trim()
  )
    return { kind: 'skill', location: input.location, name: input.name.trim().slice(0, 128), ...icons }

  return undefined
}

export function parseToolbarPins(value: unknown): ToolbarPin[] {
  if (!Array.isArray(value)) return []

  const keys = new Set<string>()

  return value.flatMap((candidate) => {
    const pin = parsePin(candidate)

    if (!pin || keys.has(toolbarPinKey(pin)) || keys.size >= 100) return []

    keys.add(toolbarPinKey(pin))

    return [pin]
  })
}

function configurePin(current: ToolbarPin, change: Extract<ToolbarPinUpdate, { operation: 'configure' }>): ToolbarPin {
  if (change.expected && change.expected !== JSON.stringify(current))
    throw new Error('Pin changed; reopen its configuration')

  const stateIcons = { ...current.stateIcons }
  const stateIconLists = { ...current.stateIconLists }
  const lists = Object.entries(change.stateIconLists ?? {})

  for (const [state, values] of lists) {
    if (!identifier(state) || (values !== null && !iconList(values)))
      throw new Error('Choose zero to three state icons')

    if (values === null) delete stateIconLists[state]
    else stateIconLists[state] = [...values]
  }
  const changes = Object.entries(change.stateIcons ?? {})

  for (const [state, icon] of changes) {
    if (!identifier(state) || (icon !== null && !identifier(icon))) throw new Error('Invalid state icon')

    if (icon === null) delete stateIcons[state]
    else stateIcons[state] = icon
  }
  const pin = parsePin({
    ...current,
    icon: change.icon,
    stateIcons,
    stateIconLists,
    ...(change.icons !== undefined && { icons: change.icons ?? undefined }),
    ...(change.text !== undefined && { text: change.text ?? undefined }),
  })

  if (!pin) throw new Error('Choose up to three icons and a single-line label')

  return pin
}

export function changeToolbarPins(current: ToolbarPin[] = [], change: ToolbarPinUpdate): ToolbarPin[] {
  const pins = parseToolbarPins(current)

  if (change.operation === 'pin') {
    const pin = parsePin(change.pin)

    if (!pin) throw new Error('Invalid toolbar pin')

    if (pins.some((item) => toolbarPinKey(item) === toolbarPinKey(pin))) throw new Error('This item is already pinned')

    if (pins.length >= 100) throw new Error('You can pin at most 100 items')

    return [...pins, pin]
  }

  const index = pins.findIndex((pin) => toolbarPinKey(pin) === change.key)

  if (index === -1) {
    if (change.operation === 'configure') throw new Error('Pin no longer exists; reopen the toolbar manager')

    return pins
  }

  if (change.operation === 'configure') {
    pins[index] = configurePin(pins[index], change)

    return pins
  }

  const [pin] = pins.splice(index, 1)

  if (change.operation === 'move') {
    const destination = pins.findIndex((item) => toolbarPinKey(item) === change.before)

    pins.splice(destination === -1 ? pins.length : destination, 0, pin)
  }

  return pins
}
