import { For, Show } from 'solid-js'

import { ShortcutKey } from './shortcut-key'

import type { SidebarShortcutAction } from '../model/shortcut-actions'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function ShortcutGroup(props: {
  api: TuiPluginApi
  title: string
  actions: readonly SidebarShortcutAction[]
  width: number
  columns: number
  compact: boolean
}) {
  const itemWidth = () => Math.max(1, Math.floor((props.width - (props.columns - 1) * 2) / props.columns))

  return (
    <box gap={0}>
      <Show when={!props.compact}>
        <text fg={props.api.theme.current.textMuted}>{props.title}</text>
      </Show>
      <box flexDirection="row" flexWrap="wrap" columnGap={2}>
        <For each={props.actions}>
          {(action) => (
            <ShortcutKey
              api={props.api}
              keyLabel={action.key}
              label={action.label}
              icon={action.icon}
              width={itemWidth()}
            />
          )}
        </For>
      </box>
    </box>
  )
}
