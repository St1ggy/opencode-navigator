export const ICON_CHOICE_IDS = [
  'plus',
  'check',
  'circle',
  'star',
  'pin',
  'bolt',
  'book',
  'search',
  'code',
  'terminal',
  'gear',
  'shield',
  'lock',
  'unlock',
  'eye',
  'clock',
  'refresh',
  'history',
  'copy',
  'export',
  'edit',
  'fork',
  'list',
  'play',
  'pause',
  'stop',
  'rocket',
  'bug',
  'beaker',
  'wand',
  'cloud',
  'server',
  'folder',
  'file',
  'heart',
  'lightbulb',
  'arrow-up',
  'arrow-down',
  'warning',
  'close',
] as const

export type IconChoiceId = (typeof ICON_CHOICE_IDS)[number]
const choices = new Set<string>(ICON_CHOICE_IDS)

export function isIconChoiceId(value: string): value is IconChoiceId {
  return choices.has(value)
}

export function iconChoiceLabel(id: string) {
  return id.replaceAll('-', ' ')
}
