import { createSignal } from 'solid-js'

import { SelectionBox, useIcons } from '../../../shared/ui'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function IconPickerSearch(props: { api: TuiPluginApi; query: string; onInput(value: string): void }) {
  const icons = useIcons()
  const [focused, setFocused] = createSignal(true)
  const theme = () => props.api.theme.current
  const fg = () => (focused() ? theme().selectedListItemText : theme().text)

  return (
    <SelectionBox
      paddingLeft={1}
      paddingRight={1}
      flexDirection="row"
      gap={1}
      backgroundColor={focused() ? theme().primary : theme().backgroundElement}
    >
      <text fg={fg()}>{icons.icon('search')}</text>
      <input
        id="icon-picker.search"
        flexGrow={1}
        focused
        value={props.query}
        placeholder="Search icons..."
        onInput={props.onInput}
        on:focused={() => setFocused(true)}
        on:blurred={() => setFocused(false)}
        textColor={fg()}
        focusedTextColor={fg()}
        placeholderColor={fg()}
        cursorColor={fg()}
        backgroundColor="transparent"
        focusedBackgroundColor="transparent"
      />
    </SelectionBox>
  )
}
