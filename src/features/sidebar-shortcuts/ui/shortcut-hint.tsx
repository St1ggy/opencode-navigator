import { TextAttributes } from '@opentui/core'
import { useTerminalDimensions } from '@opentui/solid'
import { Show } from 'solid-js'

import { SelectionBox, useIcons } from '../../../shared/ui'

import { ShortcutGroup } from './shortcut-group'
import { ShortcutKey } from './shortcut-key'

import type { SidebarShortcutAction } from '../model/shortcut-actions'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export type ShortcutHintProps = { api: TuiPluginApi; actions: readonly SidebarShortcutAction[] }

export function SidebarShortcutHint(props: ShortcutHintProps) {
  const dimensions = useTerminalDimensions()
  const icons = useIcons()
  const theme = () => props.api.theme.current
  const width = () => Math.max(1, Math.min(66, dimensions().width - 2))
  const contentWidth = () => Math.max(1, width() - 2)
  const compact = () => dimensions().height < 20
  const columns = () => (compact() ? (width() >= 50 ? 3 : 2) : width() >= 50 ? 2 : 1)
  const navigation = () => props.actions.filter((action) => action.group === 'navigate')
  const updates = () => props.actions.filter((action) => action.group === 'updates')
  const rows = () =>
    Math.ceil(navigation().length / columns()) + Math.ceil(updates().length / columns()) + (compact() ? 0 : 3)
  const bodyHeight = () => Math.min(rows(), Math.max(1, dimensions().height - 8))

  return (
    <box
      position="absolute"
      top={1}
      right={1}
      width={width()}
      maxHeight={Math.max(1, dimensions().height - 2)}
      zIndex={2000}
      backgroundColor={theme().background}
      overflow="hidden"
    >
      <SelectionBox
        id="opencode-navigator.shortcuts.hint"
        width="100%"
        backgroundColor={theme().backgroundPanel}
        paddingTop={dimensions().height < 8 ? 0 : 1}
        paddingBottom={dimensions().height < 8 ? 0 : 1}
        gap={dimensions().height < 8 ? 0 : 1}
      >
        <text fg={theme().text} attributes={TextAttributes.BOLD} wrapMode="none">
          {icons.icon('help')} Navigator shortcuts
        </text>
        <Show when={dimensions().height >= 10}>
          <scrollbox
            height={bodyHeight()}
            scrollX={false}
            verticalScrollbarOptions={{ visible: false }}
            horizontalScrollbarOptions={{ visible: false }}
          >
            <box gap={compact() ? 0 : 1}>
              <ShortcutGroup
                api={props.api}
                title="Navigate"
                actions={navigation()}
                width={contentWidth()}
                columns={columns()}
                compact={compact()}
              />
              <ShortcutGroup
                api={props.api}
                title="Updates"
                actions={updates()}
                width={contentWidth()}
                columns={columns()}
                compact={compact()}
              />
            </box>
          </scrollbox>
        </Show>
        <ShortcutKey api={props.api} keyLabel="Esc" label="Cancel" icon="close" width={contentWidth()} />
      </SelectionBox>
    </box>
  )
}
