import { type BoxRenderable, type OptimizedBuffer, RGBA } from '@opentui/core'
import { createEffect, splitProps, untrack } from 'solid-js'

import { useIcons } from './icons'

import type { UiIcon } from './icons'
import type { BoxProps } from '@opentui/solid'

const transparent = RGBA.fromInts(0, 0, 0, 0)

function selectionBackdrop(node: BoxRenderable) {
  // Paint hooks are drawing-only on native-scene hosts. Resolve the surrounding
  // presentation color from ancestors instead of sampling the destination frame.
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (
      'backgroundColor' in parent &&
      parent.backgroundColor instanceof RGBA &&
      parent.backgroundColor.a > 0 &&
      (!('shouldFill' in parent) || parent.shouldFill !== false)
    )
      return parent.backgroundColor
  }

  return transparent
}

function paintCorners(node: BoxRenderable, buffer: OptimizedBuffer, icons: ReturnType<typeof useIcons>) {
  const backdrop = selectionBackdrop(node)

  if (node.backgroundColor.equals(backdrop)) return

  const left = node.screenX
  const right = left + node.width - 1
  const top = node.screenY
  const bottom = top + node.height - 1
  const multiline = node.height > 1
  const positions: [number, number, UiIcon][] = multiline
    ? [
        [left, top, 'selectionTopLeft'],
        [right, top, 'selectionTopRight'],
        [left, bottom, 'selectionBottomLeft'],
        [right, bottom, 'selectionBottomRight'],
      ]
    : [
        [left, top, 'selectionLeft'],
        [right, top, 'selectionRight'],
      ]

  for (const [x, y, icon] of positions) {
    if (x < 0 || y < 0 || x >= buffer.width || y >= buffer.height) continue

    buffer.setCell(
      x,
      y,
      icons.icon(icon),
      multiline ? backdrop : node.backgroundColor,
      multiline ? node.backgroundColor : backdrop,
    )
  }
}

// Paint shaped edges inside the existing padding, preserving layout and mouse targets.
export function SelectionBox(props: BoxProps & { iconOnly?: boolean }) {
  const icons = useIcons()
  // Forward refs once: a native spread must not register the same keyboard target again.
  const [local, boxProps] = splitProps(props, ['ref', 'iconOnly'])
  // Icon controls reserve exactly one cell for each cap around one content cell.
  let node: BoxRenderable | undefined

  createEffect(() => {
    icons.style()
    icons.multilineCorners()
    node?.requestRender()
  })

  function after(this: BoxRenderable, buffer: OptimizedBuffer, delta: number) {
    if (
      !this.buffered &&
      this.width >= 3 &&
      this.height >= 1 &&
      this.backgroundColor.a > 0 &&
      (this.height === 1 || icons.multilineCorners())
    )
      paintCorners(this, buffer, icons)

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
      renderAfter={icons.style() === 'nerd' ? after : props.renderAfter}
    />
  )
}
