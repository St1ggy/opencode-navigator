/** @jsxImportSource @opentui/solid */
import { RGBA } from '@opentui/core'
import { testRender } from '@opentui/solid'
import { expect, test } from 'bun:test'

import { SelectionBox } from '../src/shared/ui'

test('rounded corner backdrops skip ancestors that do not paint their background', async () => {
  const h = await testRender(
    () => (
      <box backgroundColor="#123456">
        <box backgroundColor="#abcdef" shouldFill={false}>
          <SelectionBox width={8} height={1} backgroundColor="#fedcba">
            <text>Corner</text>
          </SelectionBox>
        </box>
      </box>
    ),
    { width: 12, height: 3 },
  )

  try {
    await h.flush()
    const background = h.renderer.currentRenderBuffer.withBuffers((cells) => new RGBA(cells.bg.slice(0, 4)))

    expect(background.equals(RGBA.fromHex('#123456'))).toBe(true)
  } finally {
    h.renderer.destroy()
  }
})
