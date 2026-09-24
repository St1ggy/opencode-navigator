import { useIcons } from '../icons'
import { SelectionBox } from '../selection-box'

import type { UiIcon } from '../icons'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function DialogAction(props: {
  api: TuiPluginApi
  id: string
  label: string
  icon: UiIcon
  selected: boolean
  disabled?: boolean
  onSelect: () => void
  onActivate: () => void
}) {
  const icons = useIcons()
  const selected = () => props.selected && !props.disabled
  const theme = () => props.api.theme.current

  return (
    <SelectionBox
      id={props.id}
      backgroundColor={selected() ? theme().primary : undefined}
      onMouseOver={() => props.onSelect()}
      onMouseDown={(event) => event.stopPropagation()}
      onMouseUp={(event) => {
        event.stopPropagation()

        if (!props.disabled) props.onActivate()
      }}
    >
      <text fg={selected() ? theme().selectedListItemText : theme().textMuted}>
        {icons.icon(props.icon)} {props.label}
      </text>
    </SelectionBox>
  )
}
