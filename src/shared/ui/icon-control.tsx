import { SelectionBox } from './selection-box'

import type { BoxRenderable, ColorInput, MouseEvent } from '@opentui/core'
import type { JSX } from 'solid-js'

export type IconControlProps = {
  ref?: (node: BoxRenderable) => void
  id?: string
  icon: JSX.Element
  backgroundColor?: ColorInput
  foregroundColor?: ColorInput
  onMouseOver?: () => void
  onMouseOut?: () => void
  onMouseDown?: (event: MouseEvent) => void
  onMouseUp?: (event: MouseEvent) => void
}

export function IconControl(props: IconControlProps) {
  function mouseOver(event: MouseEvent) {
    props.onMouseOver?.()
    event.stopPropagation()
  }

  function mouseOut(event: MouseEvent) {
    props.onMouseOut?.()
    event.stopPropagation()
  }

  return (
    <SelectionBox
      iconOnly
      width={3}
      height={1}
      flexShrink={0}
      alignSelf="flex-start"
      alignItems="center"
      justifyContent="center"
      ref={props.ref}
      id={props.id}
      backgroundColor={props.backgroundColor}
      onMouseOver={mouseOver}
      onMouseOut={mouseOut}
      onMouseDown={(event) => {
        event.stopPropagation()
        props.onMouseDown?.(event)
      }}
      onMouseUp={(event) => {
        event.stopPropagation()
        props.onMouseUp?.(event)
      }}
    >
      <text height={1} fg={props.foregroundColor} onMouseOver={mouseOver} onMouseOut={mouseOut}>
        {props.icon}
      </text>
    </SelectionBox>
  )
}
