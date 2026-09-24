import { splitProps } from 'solid-js'

import { SelectionBox } from './selection-box'

import type { BoxProps } from '@opentui/solid'
import type { JSX } from 'solid-js'

export type ListRowProps = Omit<BoxProps, 'children'> & {
  leading?: JSX.Element
  content: JSX.Element
  details?: JSX.Element
  metadata?: JSX.Element
  trailing?: JSX.Element
  contentGap?: number
}

export function ListRow(props: ListRowProps) {
  const [slots, presentation] = splitProps(props, [
    'leading',
    'content',
    'details',
    'metadata',
    'trailing',
    'contentGap',
  ])

  return (
    <SelectionBox {...presentation}>
      <box flexDirection="row" gap={slots.contentGap ?? 1} minWidth={0}>
        {slots.leading}
        {slots.content}
        {slots.metadata}
        {slots.trailing}
      </box>
      {slots.details}
    </SelectionBox>
  )
}
