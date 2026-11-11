import {
  parseToolbarPins,
  toolbarPinIcons,
  toolbarPinKey,
  validToolbarPinIcon,
  validToolbarPinIcons,
  validToolbarPinText,
} from './toolbar-pins'

import type { ToolbarPin, ToolbarPinUpdate } from './toolbar-pins'

export type ToolbarAppearance = {
  base: readonly string[]
  text: string
  states: Readonly<Record<string, readonly string[]>>
}

export function toolbarPinAppearance(pin: ToolbarPin): ToolbarAppearance {
  return {
    base: [...toolbarPinIcons(pin)],
    text: pin.text ?? '',
    states: Object.fromEntries(
      Object.keys({ ...pin.stateIcons, ...pin.stateIconLists }).map((state) => [
        state,
        [...toolbarPinIcons(pin, state)],
      ]),
    ),
  }
}

export function toolbarPinAppearanceChange(
  source: ToolbarPin,
  draft: ToolbarAppearance,
  expected?: string,
): ToolbarPinUpdate {
  const text = draft.text.trim()

  if (!validToolbarPinText(draft.text)) throw new Error('Use a single line of up to 128 characters')

  if (
    !validToolbarPinIcons(draft.base) ||
    Object.entries(draft.states).some(([key, values]) => !validToolbarPinIcon(key) || !validToolbarPinIcons(values))
  )
    throw new Error('Choose zero to three valid icons for each appearance')

  if (!text && (draft.base.length === 0 || Object.values(draft.states).some((value) => value.length === 0)))
    throw new Error('Add an icon or text for every configured appearance')

  const stateIcons = Object.fromEntries(
    Object.entries(draft.states)
      .filter(([, value]) => value.length === 1)
      .map(([key, value]) => [key, value[0]]),
  )
  const stateIconLists = Object.fromEntries(
    Object.entries(draft.states)
      .filter(([, value]) => value.length !== 1)
      .map(([key, value]) => [key, [...value]]),
  )
  const pin: ToolbarPin = {
    ...source,
    icon: draft.base[0] ?? source.icon,
    icons: draft.base.length === 1 ? undefined : [...draft.base],
    text: text || undefined,
    stateIcons,
    stateIconLists,
  }

  if (parseToolbarPins([pin]).length !== 1) throw new Error('Choose up to three icons and a single-line label')

  if (!expected) return { operation: 'pin', pin }

  const keys = Object.keys({ ...toolbarPinAppearance(source).states, ...draft.states })

  return {
    operation: 'configure',
    key: toolbarPinKey(pin),
    icon: pin.icon,
    icons: pin.icons ?? null,
    text: pin.text ?? null,
    expected,
    stateIcons: Object.fromEntries(keys.map((key) => [key, stateIcons[key] ?? null])),
    stateIconLists: Object.fromEntries(keys.map((key) => [key, stateIconLists[key] ?? null])),
  }
}
