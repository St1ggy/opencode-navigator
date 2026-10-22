import { QUICK_ACTION_IDS, type QuickActionId } from '../../../shared/config'

type PinIcons = { icon: string; stateIcons?: Record<string, string> }
export type ToolbarPin = PinIcons &
  ({ kind: 'action'; id: QuickActionId } | { kind: 'skill'; location: string; name: string })
export type ToolbarPinUpdate =
  | { operation: 'pin'; pin: ToolbarPin }
  | { operation: 'configure'; key: string; icon: string; stateIcons?: Record<string, string | null>; expected?: string }
  | { operation: 'remove'; key: string }
  | { operation: 'move'; key: string; before?: string }

export function toolbarPinKey(pin: ToolbarPin): string {
  return pin.kind === 'action' ? `action:${pin.id}` : `skill:${pin.location}`
}

function identifier(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z][a-z\d-]{0,47}$/u.test(value)
}

function parsePin(value: unknown): ToolbarPin | undefined {
  if (!value || typeof value !== 'object') return

  const input = value as Record<string, unknown>

  if (!identifier(input.icon)) return

  const stateIcons = Object.fromEntries(
    Object.entries(input.stateIcons && typeof input.stateIcons === 'object' ? input.stateIcons : {}).filter(
      ([key, icon]) => identifier(key) && identifier(icon),
    ),
  ) as Record<string, string>
  const icons = { icon: input.icon, ...(Object.keys(stateIcons).length > 0 && { stateIcons }) }

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
    if (change.expected && change.expected !== JSON.stringify(pins[index]))
      throw new Error('Pin changed; reopen its configuration')

    const stateIcons = { ...pins[index].stateIcons }

    const changes = Object.entries(change.stateIcons ?? {})

    for (const [state, icon] of changes) {
      if (!identifier(state) || (icon !== null && !identifier(icon))) throw new Error('Invalid state icon')

      if (icon === null) delete stateIcons[state]
      else stateIcons[state] = icon
    }
    const pin = parsePin({ ...pins[index], icon: change.icon, stateIcons })

    if (!pin) throw new Error('Invalid toolbar icon')

    pins[index] = pin

    return pins
  }

  const [pin] = pins.splice(index, 1)

  if (change.operation === 'move') {
    const destination = pins.findIndex((item) => toolbarPinKey(item) === change.before)

    pins.splice(destination === -1 ? pins.length : destination, 0, pin)
  }

  return pins
}
