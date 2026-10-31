import { expect, test } from 'bun:test'

import { ptyFrame } from '../scripts/pty-frame.mjs'

test('PTY readiness reconstructs unchanged characters and optimized whitespace instead of matching raw output', () => {
  const original = '\u{1B}[2J\u{1B}[1;1HCommands'
  const update = '\u{1B}[1;2Hhoose\u{1B}[1;7H \u{1B}[1;8HTodo\u{1B}[1;13Hconfiguration'

  expect(update).not.toContain('Choose Todo configuration')
  expect(ptyFrame(original + update, 40, 3)).toContain('Choose Todo configuration')
  expect(ptyFrame(`${original}\u{1B}[1;1H\u{1B}[2K`, 40, 3).trim()).toBe('')
})
