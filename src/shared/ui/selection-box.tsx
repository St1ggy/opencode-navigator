import { type BoxRenderable, type OptimizedBuffer, RGBA } from '@opentui/core'
import { createEffect, splitProps, untrack } from 'solid-js'

import { useIcons } from './icons'

import type { UiIcon } from './icons'
import type { BoxProps } from '@opentui/solid'

type Corner = { x: number; y: number; icon: UiIcon; backdrop: RGBA }

// Paint shaped edges inside the existing padding, preserving layout and mouse targets.
export function SelectionBox(props: BoxProps & { iconOnly?: boolean }) {
  const icons = useIcons()
  // Forward refs once: a native spread must not register the same keyboard target again.
  const [local, boxProps] = splitProps(props, ['ref', 'iconOnly'])
  // Icon controls reserve exactly one cell for each cap around one content cell.
  let node: BoxRenderable | undefined
  let corners: Corner[] = []

  createEffect(() => {
    icons.style()
    icons.multilineCorners()
    node?.requestRender()
  })

  function before(this: BoxRenderable, buffer: OptimizedBuffer, delta: number) {
    props.renderBefore?.call(this, buffer, delta)
    corners = []

    if (
      this.buffered ||
      this.width < 3 ||
      this.height < 1 ||
      this.backgroundColor.a === 0 ||
      (this.height > 1 && !icons.multilineCorners())
    )
      return

    const left = this.screenX
    const right = left + this.width - 1
    const top = this.screenY
    const bottom = top + this.height - 1
    const positions: [number, number, UiIcon][] =
      this.height === 1
        ? [
            [left, top, 'selectionLeft'],
            [right, top, 'selectionRight'],
          ]
        : [
            [left, top, 'selectionTopLeft'],
            [right, top, 'selectionTopRight'],
            [left, bottom, 'selectionBottomLeft'],
            [right, bottom, 'selectionBottomRight'],
          ]
    const background = buffer.buffers.bg

    for (const [x, y, icon] of positions) {
      if (x < 0 || y < 0 || x >= buffer.width || y >= buffer.height) continue

      const offset = (y * buffer.width + x) * 4
      const backdrop = new RGBA(background.slice(offset, offset + 4))

      if (!this.backgroundColor.equals(backdrop)) corners.push({ x, y, icon, backdrop })
    }
  }

  function after(this: BoxRenderable, buffer: OptimizedBuffer, delta: number) {
    for (const corner of corners) {
      // A terminal paints cell backgrounds across line spacing, but not glyph ink.
      // Multiline corners therefore mask only the outside instead of filling the inside.
      const multiline = this.height > 1

      buffer.setCell(
        corner.x,
        corner.y,
        icons.icon(corner.icon),
        multiline ? corner.backdrop : this.backgroundColor,
        multiline ? this.backgroundColor : corner.backdrop,
      )
    }
    props.renderAfter?.call(this, buffer, delta)
  }

  return (
    <box
      {...boxProps}
      ref={(value) => {
        node = value

        untrack(() => {
          if (typeof local.ref === 'function') local.ref(value)
        })
      }}
      paddingLeft={props.paddingLeft ?? props.padding ?? (local.iconOnly && icons.style() === 'text' ? 0 : 1)}
      paddingRight={props.paddingRight ?? props.padding ?? (local.iconOnly && icons.style() === 'text' ? 0 : 1)}
      renderBefore={icons.style() === 'nerd' ? before : props.renderBefore}
      renderAfter={icons.style() === 'nerd' ? after : props.renderAfter}
    />
  )
}
