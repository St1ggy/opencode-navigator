/** @jsxImportSource @opentui/solid */
import { BoxRenderable, RGBA, type ScrollBoxRenderable } from '@opentui/core'
import { testRender } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { createSignal } from 'solid-js'

import { IconProvider } from '../src/icons/context'
import { type IconStyle, uiIcon } from '../src/icons/ui'
import { SelectionBox } from '../src/shared/ui'

test('rounded selections preserve layout, clicks, backdrop colors and live text fallback', async () => {
  const [style, setStyle] = createSignal<IconStyle>('nerd')
  const [selected, setSelected] = createSignal(true)
  const [backdrop, setBackdrop] = createSignal('#123456')
  let row!: BoxRenderable
  let clicks = 0
  let bindings = 0
  let before = 0
  let after = 0
  const setup = await testRender(
    () => (
      <IconProvider style={style}>
        <box backgroundColor={backdrop()} padding={1}>
          <SelectionBox
            ref={(node) => {
              row = node
              bindings++
            }}
            width={16}
            height={1}
            backgroundColor={selected() ? '#abcdef' : backdrop()}
            renderBefore={() => {
              before++
            }}
            renderAfter={() => {
              after++
            }}
            onMouseUp={() => {
              clicks++
            }}
          >
            <text>Selected</text>
          </SelectionBox>
        </box>
      </IconProvider>
    ),
    { width: 22, height: 4 },
  )

  try {
    await setup.flush()
    expect(row).toBeInstanceOf(BoxRenderable)
    const bounds = [row.x, row.y, row.width, row.height]
    const frame = () => setup.captureCharFrame().split('\n')[row.y]

    expect(frame()[row.x]).toBe(uiIcon('selectionLeft'))
    expect(frame()[row.x + row.width - 1]).toBe(uiIcon('selectionRight'))
    expect(frame()).toContain('Selected')
    const colorAt = (x: number, channel: 'fg' | 'bg') => {
      const buffer = setup.renderer.currentRenderBuffer
      const offset = (row.y * buffer.width + x) * 4

      return new RGBA(buffer.buffers[channel].slice(offset, offset + 4))
    }

    expect(colorAt(row.x, 'bg').equals(RGBA.fromHex(backdrop()))).toBe(true)
    expect(colorAt(row.x, 'fg').equals(RGBA.fromHex('#abcdef'))).toBe(true)
    expect(colorAt(row.x + 1, 'bg').equals(RGBA.fromHex('#abcdef'))).toBe(true)
    await setup.mockMouse.click(row.x, row.y)
    await setup.mockMouse.click(row.x + row.width - 1, row.y)
    expect(clicks).toBe(2)
    setBackdrop('#654321')
    await setup.flush()
    expect(colorAt(row.x, 'bg').equals(RGBA.fromHex(backdrop()))).toBe(true)
    setStyle('text')
    await setup.flush()
    expect(frame()).not.toContain(uiIcon('selectionLeft'))
    expect(colorAt(row.x, 'bg').equals(RGBA.fromHex('#abcdef'))).toBe(true)
    expect([row.x, row.y, row.width, row.height]).toEqual(bounds)
    setStyle('nerd')
    setSelected(false)
    await setup.flush()
    expect(frame()).not.toContain(uiIcon('selectionLeft'))
    setSelected(true)
    await setup.flush()
    expect(frame()).toContain(uiIcon('selectionLeft'))
    expect(before).toBeGreaterThan(0)
    expect(after).toBe(before)
    expect(bindings).toBe(1)
  } finally {
    setup.renderer.destroy()
  }
})

test('icon-only selections occupy one content cell between two rounded caps', async () => {
  let control!: BoxRenderable
  const setup = await testRender(
    () => (
      <IconProvider style={() => 'nerd'}>
        <box flexDirection="row">
          <SelectionBox ref={(node) => (control = node)} iconOnly backgroundColor="#abcdef">
            <text>*</text>
          </SelectionBox>
        </box>
      </IconProvider>
    ),
    { width: 10, height: 1 },
  )

  try {
    await setup.flush()
    expect(control.width).toBe(3)
    expect(setup.captureCharFrame()).toContain(`${uiIcon('selectionLeft')}*${uiIcon('selectionRight')}`)
  } finally {
    setup.renderer.destroy()
  }
})

test('multiline font corners respect clipping and nested selection backgrounds', async () => {
  let scroll!: ScrollBoxRenderable
  const setup = await testRender(
    () => (
      <box backgroundColor="#123456">
        <text>HEADER</text>
        <scrollbox ref={(node) => (scroll = node)} height={2} width={18}>
          <SelectionBox width={18} height={3} backgroundColor="#abcdef">
            <text>First</text>
            <SelectionBox width={9} height={1} backgroundColor="#ff0000">
              <text>Nested</text>
            </SelectionBox>
            <text>Last</text>
          </SelectionBox>
        </scrollbox>
        <text>FOOTER</text>
      </box>
    ),
    { width: 24, height: 5 },
  )

  try {
    await setup.flush()
    const shapedCorners = /[╭╮╰╯\u{E0B8}\u{E0BA}\u{E0BC}\u{E0BE}]/u

    expect(setup.captureCharFrame()).not.toMatch(shapedCorners)
    expect(setup.captureCharFrame()).toContain(uiIcon('selectionTopLeft'))
    expect(setup.captureCharFrame()).not.toContain(uiIcon('selectionBottomLeft'))
    const buffer = setup.renderer.currentRenderBuffer
    const edgeOffset = buffer.width * 4

    expect(new RGBA(buffer.buffers.bg.slice(edgeOffset, edgeOffset + 4)).equals(RGBA.fromHex('#abcdef'))).toBe(true)
    expect(new RGBA(buffer.buffers.fg.slice(edgeOffset, edgeOffset + 4)).equals(RGBA.fromHex('#123456'))).toBe(true)
    const nestedOffset = (2 * buffer.width + 1) * 4

    expect(new RGBA(buffer.buffers.bg.slice(nestedOffset, nestedOffset + 4)).equals(RGBA.fromHex('#abcdef'))).toBe(true)
    scroll.scrollTo(1)
    await setup.flush()
    const frame = setup.captureCharFrame()

    expect(frame).toContain('HEADER')
    expect(frame).toContain('FOOTER')
    expect(frame).not.toMatch(shapedCorners)
    expect(frame).not.toContain(uiIcon('selectionTopLeft'))
    expect(frame).toContain(uiIcon('selectionBottomLeft'))
    expect(frame).toContain('Last')
    expect(frame).toContain(uiIcon('selectionLeft'))
  } finally {
    setup.renderer.destroy()
  }
})

test('two-line selections keep a continuous background under all corner masks', async () => {
  const setup = await testRender(
    () => (
      <box backgroundColor="#16161e" padding={1}>
        <SelectionBox width={18} height={2} backgroundColor="#292e42">
          <text>Skill</text>
          <text>Description</text>
        </SelectionBox>
      </box>
    ),
    { width: 22, height: 4 },
  )

  try {
    await setup.flush()
    const buffer = setup.renderer.currentRenderBuffer

    // The terminal can add line spacing beyond glyph bounds. Every selected cell,
    // including the joins at the left/right edges, must own the selection background.
    for (const y of [1, 2]) {
      for (let x = 1; x <= 18; x++) {
        const offset = (y * buffer.width + x) * 4

        expect(new RGBA(buffer.buffers.bg.slice(offset, offset + 4)).equals(RGBA.fromHex('#292e42'))).toBe(true)
      }
    }
    const frame = setup.captureCharFrame()

    for (const corner of [
      'selectionTopLeft',
      'selectionTopRight',
      'selectionBottomLeft',
      'selectionBottomRight',
    ] as const) {
      expect(frame).toContain(uiIcon(corner))
    }
    expect(frame).toContain('Description')
  } finally {
    setup.renderer.destroy()
  }
})

test('corner-font fallback keeps Nerd icons and single-line caps but makes multiline selections rectangular', async () => {
  const [corners, setCorners] = createSignal(true)
  const setup = await testRender(
    () => (
      <IconProvider style={() => 'nerd'} multilineCorners={corners}>
        <SelectionBox width={18} height={2} backgroundColor="#292e42">
          <text>Multiline</text>
          <text>{uiIcon('settings')}</text>
        </SelectionBox>
        <SelectionBox width={9} height={1} backgroundColor="#abcdef">
          <text>Single</text>
        </SelectionBox>
      </IconProvider>
    ),
    { width: 22, height: 4 },
  )

  try {
    await setup.flush()
    expect(setup.captureCharFrame()).toContain(uiIcon('selectionTopLeft'))
    setCorners(false)
    await setup.flush()
    const frame = setup.captureCharFrame()

    expect(frame).not.toContain(uiIcon('selectionTopLeft'))
    expect(frame).toContain(uiIcon('settings'))
    expect(frame).toContain(uiIcon('selectionLeft'))
  } finally {
    setup.renderer.destroy()
  }
})
