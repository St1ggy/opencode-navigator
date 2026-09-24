import { TextAttributes } from '@opentui/core'

import { SelectionBox, useIcons } from '../../../shared/ui'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function SkillConfirmation(props: {
  api: TuiPluginApi
  skip: boolean
  active?: 'accept' | 'cancel'
  onToggleSkip: () => void
  onActive: (active: 'accept' | 'cancel') => void
  onAccept: () => void
  onCancel: () => void
}) {
  const icons = useIcons()
  const theme = () => props.api.theme.current

  return (
    <box border={['top']} borderColor={theme().borderSubtle}>
      <text fg={theme().accent} attributes={TextAttributes.BOLD}>
        {icons.icon('done')} Confirmation
      </text>
      <box flexDirection="row" gap={1} onMouseDown={props.onToggleSkip}>
        <text fg={props.skip ? theme().accent : theme().textMuted}>
          {icons.icon(props.skip ? 'checked' : 'unchecked')}
        </text>
        <text fg={theme().text}>Don't show again for this skill</text>
        <text fg={theme().textMuted}>({icons.key('space')})</text>
      </box>
      <box flexDirection="row" justifyContent="flex-end">
        <SelectionBox
          paddingLeft={1}
          paddingRight={1}
          backgroundColor={props.active === 'cancel' ? theme().primary : undefined}
          onMouseOver={() => props.onActive('cancel')}
          onMouseDown={(event) => event.stopPropagation()}
          onMouseUp={(event) => {
            event.stopPropagation()
            props.onCancel()
          }}
        >
          <text fg={props.active === 'cancel' ? theme().selectedListItemText : theme().textMuted}>
            {icons.icon('close')} Cancel
          </text>
        </SelectionBox>
        <SelectionBox
          paddingLeft={1}
          paddingRight={1}
          backgroundColor={props.active === 'accept' ? theme().primary : undefined}
          onMouseOver={() => props.onActive('accept')}
          onMouseDown={(event) => event.stopPropagation()}
          onMouseUp={(event) => {
            event.stopPropagation()
            props.onAccept()
          }}
        >
          <text fg={props.active === 'accept' ? theme().selectedListItemText : theme().textMuted}>
            {icons.icon('done')} Accept
          </text>
        </SelectionBox>
      </box>
    </box>
  )
}
