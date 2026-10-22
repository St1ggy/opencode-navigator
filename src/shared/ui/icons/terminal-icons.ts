// Stable, single-cell action glyphs. Structural corner masks are not selectable.
const glyphs: Record<string, readonly [string, string]> = {
  plus: ['\u{EA60}', '+'],
  check: ['\u{EAB2}', 'v'],
  circle: ['\u{EAEE}', 'o'],
  star: ['\u{EA6A}', '*'],
  pin: ['\u{EBAB}', '^'],
  bolt: ['\u{EA86}', '!'],
  book: ['\u{EAA4}', 'B'],
  search: ['\u{EA6D}', '?'],
  code: ['\u{EAC4}', '#'],
  terminal: ['\u{EA85}', '>'],
  gear: ['\u{EB51}', 'G'],
  shield: ['\u{EBB3}', 'S'],
  lock: ['\u{EA75}', 'L'],
  unlock: ['\u{EB74}', 'U'],
  eye: ['\u{EA70}', 'E'],
  clock: ['\u{EA82}', 'T'],
  refresh: ['\u{EAF5}', 'R'],
  history: ['\u{EA82}', 'H'],
  copy: ['\u{EBCC}', 'C'],
  export: ['\u{EBAC}', 'X'],
  edit: ['\u{EA73}', '/'],
  fork: ['\u{EB9E}', 'F'],
  list: ['\u{EBEB}', '='],
  play: ['\u{EB2C}', '>'],
  pause: ['\u{EAD1}', '|'],
  stop: ['\u{EAD7}', 's'],
  rocket: ['\u{EB44}', 'r'],
  bug: ['\u{EAAF}', 'b'],
  beaker: ['\u{EA79}', 't'],
  wand: ['\u{EAB6}', 'w'],
  cloud: ['\u{EABA}', 'c'],
  server: ['\u{EB50}', 's'],
  folder: ['\u{EA83}', 'D'],
  file: ['\u{EA7B}', 'f'],
  heart: ['\u{EB05}', 'h'],
  lightbulb: ['\u{EA61}', 'i'],
  'arrow-up': ['\u{EAA1}', '^'],
  'arrow-down': ['\u{EA9A}', 'v'],
  warning: ['\u{EA6C}', '!'],
  close: ['\u{EA76}', 'x'],
}

export const terminalIconIDs = Object.keys(glyphs)
export function terminalIcon(id: string, style: 'nerd' | 'text'): string {
  return (glyphs[id] ?? glyphs.bolt)[style === 'nerd' ? 0 : 1]
}
export function terminalIconLabel(id: string): string {
  return id.replaceAll('-', ' ')
}
