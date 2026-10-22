import { TextAttributes } from '@opentui/core'
import { Show } from 'solid-js'

import { BookmarkControl, IconControl, terminalIcon, useIcons } from '../../../shared/ui'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function SkillDialogHeader(props: {
  api: TuiPluginApi
  name: string
  favorite: boolean
  favoriteDisabled: boolean
  active: string
  onActive(value: 'favorite' | 'configure'): void
  onFavorite(): void
  onConfigure?: () => void
  onCancel(): void
}) {
  const icons = useIcons()
  const theme = () => props.api.theme.current

  return (
    <box flexDirection="row" justifyContent="space-between" alignItems="center">
      <text attributes={TextAttributes.BOLD} fg={theme().text} truncate wrapMode="none" flexGrow={1}>
        {icons.icon('skills')} {props.name}
      </text>
      <box flexDirection="row" gap={1} alignItems="center">
        <Show when={props.onConfigure}>
          <IconControl
            icon={terminalIcon('pin', icons.style())}
            foregroundColor={props.active === 'configure' ? theme().selectedListItemText : theme().textMuted}
            backgroundColor={props.active === 'configure' ? theme().primary : undefined}
            onMouseOver={() => props.onActive('configure')}
            onMouseUp={() => props.onConfigure?.()}
          />
        </Show>
        <BookmarkControl
          bookmarked={props.favorite}
          backgroundColor={props.active === 'favorite' ? theme().primary : undefined}
          foregroundColor={
            props.favoriteDisabled
              ? theme().textMuted
              : props.active === 'favorite'
                ? theme().selectedListItemText
                : theme().warning
          }
          onMouseOver={() => {
            if (!props.favoriteDisabled) props.onActive('favorite')
          }}
          onMouseUp={() => {
            if (!props.favoriteDisabled) props.onFavorite()
          }}
        />
        <text
          fg={theme().textMuted}
          onMouseDown={(event) => event.stopPropagation()}
          onMouseUp={(event) => {
            event.stopPropagation()
            props.onCancel()
          }}
        >
          {icons.key('esc')}
        </text>
      </box>
    </box>
  )
}
