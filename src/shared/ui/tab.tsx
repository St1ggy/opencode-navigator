import { type RGBA, TextAttributes } from '@opentui/core'
import { type JSX, Show, splitProps } from 'solid-js'

import { SelectionBox } from './selection-box'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { BoxProps } from '@opentui/solid'

export function Tab(
  props: BoxProps & {
    api: TuiPluginApi
    selected: boolean
    focused?: boolean
    foregroundColor?: RGBA
    count?: string | number
    children: JSX.Element
  },
) {
  const [local, boxProps] = splitProps(props, ['api', 'selected', 'focused', 'foregroundColor', 'count', 'children'])
  const theme = () => local.api.theme.current

  return (
    <SelectionBox
      {...boxProps}
      height={1}
      minWidth={0}
      paddingLeft={props.paddingLeft ?? 1}
      paddingRight={props.paddingRight ?? 1}
      backgroundColor={
        local.focused ? theme().primary : local.selected ? theme().backgroundElement : props.backgroundColor
      }
    >
      <box flexDirection="row" gap={1} minWidth={0}>
        <text
          fg={
            local.focused
              ? theme().selectedListItemText
              : local.selected
                ? theme().accent
                : (local.foregroundColor ?? theme().textMuted)
          }
          attributes={local.selected ? TextAttributes.BOLD : undefined}
          wrapMode="none"
          truncate
          height={1}
        >
          {local.children}
        </text>
        <Show when={local.count !== undefined}>
          <text
            flexShrink={0}
            fg={local.focused ? theme().selectedListItemText : theme().textMuted}
            attributes={TextAttributes.DIM}
            wrapMode="none"
            height={1}
          >
            {local.count}
          </text>
        </Show>
      </box>
    </SelectionBox>
  )
}
