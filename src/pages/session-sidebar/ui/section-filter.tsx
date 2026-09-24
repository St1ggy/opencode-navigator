import { Show, createSignal, onCleanup } from 'solid-js'

import { SelectionBox, useIcons } from '../../../shared/ui'

import { useSidebarItem } from './sidebar-item'

import type { SidebarInteraction, SidebarPosition } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { BoxRenderable, InputRenderable } from '@opentui/core'

export function SectionFilter(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  id?: string
  position?: SidebarPosition
  query: string
  placeholder: string
  onInput: (value: string) => void
}) {
  const icons = useIcons()
  let input: InputRenderable | undefined
  let unregisterInput: (() => void) | undefined
  const [inputFocused, setInputFocused] = createSignal(false)
  const theme = () => props.api.theme.current
  const item = useSidebarItem(props.api, props.interaction, {
    id: props.id ?? `filter.${props.placeholder}`,
    position: () => props.position ?? { section: 0, row: 0, column: 0 },
    activate: () => {
      if (!input) return

      setInputFocused(true)
      props.interaction?.focusFilter(input)

      if (!props.interaction) input.focus()
    },
  })
  const highlighted = () => item.focused() || inputFocused()
  const textColor = () => (highlighted() ? theme().selectedListItemText : theme().text)
  const mutedColor = () => (highlighted() ? theme().selectedListItemText : theme().textMuted)

  function leaveInput(event?: { preventDefault(): void; stopPropagation(): void }) {
    event?.preventDefault()
    event?.stopPropagation()
    setInputFocused(false)

    if (input && props.interaction) props.interaction.leaveFilter(input)
    else input?.blur()
  }
  onCleanup(() => unregisterInput?.())

  return (
    <SelectionBox
      ref={(node: BoxRenderable) => item.ref(node)}
      id={props.id}
      flexDirection="row"
      gap={1}
      marginTop={1}
      marginBottom={1}
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={highlighted() ? theme().primary : item.backgroundColor()}
      onMouseOver={item.onMouseOver}
      onMouseOut={item.onMouseOut}
      onMouseDown={(event) => item.activate(event)}
    >
      <text flexShrink={0} fg={mutedColor()}>
        {icons.icon('search')}
      </text>
      <input
        ref={(node: InputRenderable) => {
          input = node
          unregisterInput?.()
          unregisterInput = props.interaction?.registerFilter(node, props.id ?? `filter.${props.placeholder}`, () =>
            leaveInput(),
          )
        }}
        flexGrow={1}
        value={props.query}
        placeholder={props.placeholder}
        placeholderColor={mutedColor()}
        textColor={textColor()}
        focusedTextColor={textColor()}
        backgroundColor="transparent"
        focusedBackgroundColor="transparent"
        cursorColor={highlighted() ? theme().selectedListItemText : theme().accent}
        focused={inputFocused()}
        on:focused={() => setInputFocused(true)}
        on:blurred={() => setInputFocused(false)}
        onInput={props.onInput}
        onSubmit={() => leaveInput()}
        onKeyDown={(event) => {
          if (event.name !== 'escape') return

          leaveInput(event)
        }}
      />
      <Show when={props.query}>
        <text flexShrink={0} fg={mutedColor()} onMouseDown={() => props.onInput('')}>
          {icons.icon('close')}
        </text>
      </Show>
    </SelectionBox>
  )
}
