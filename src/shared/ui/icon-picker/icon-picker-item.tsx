import { SelectionBox, terminalIcon, terminalIconLabel, useIcons } from '../../../shared/ui'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function IconPickerItem(props: {
  api: TuiPluginApi
  id: string
  active: boolean
  selected: boolean
  onHover(): void
  onSelect(): void
}) {
  const icons = useIcons()
  const theme = () => props.api.theme.current

  return (
    <SelectionBox
      id={`icon-picker.${props.id}`}
      width={9}
      height={2}
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={props.active ? theme().backgroundElement : undefined}
      onMouseOver={props.onHover}
      onMouseDown={(event) => event.stopPropagation()}
      onMouseUp={(event) => {
        event.stopPropagation()
        props.onSelect()
      }}
    >
      <text fg={props.active || props.selected ? theme().accent : theme().text} truncate wrapMode="none">
        {terminalIcon(props.id, icons.style())}
        {props.selected ? ' *' : ''}
      </text>
      <text fg={theme().textMuted} truncate wrapMode="none">
        {terminalIconLabel(props.id)}
      </text>
    </SelectionBox>
  )
}
