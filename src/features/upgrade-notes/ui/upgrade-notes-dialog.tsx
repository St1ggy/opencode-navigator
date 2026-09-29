import { TextAttributes } from '@opentui/core'
import { useTerminalDimensions } from '@opentui/solid'
import { For } from 'solid-js'

import { DialogSurface, SelectionBox, useDialogs, useIcons } from '../../../shared/ui'

import type { ChangelogEntry } from '../model/changelog'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function UpgradeNotesDialog(props: {
  api: TuiPluginApi
  previous: string
  current: string
  entries: ChangelogEntry[]
}) {
  const dimensions = useTerminalDimensions()
  const dialogs = useDialogs(props.api)
  const icons = useIcons()
  const theme = () => props.api.theme.current

  return (
    <DialogSurface api={props.api} lift>
      <text fg={theme().text} attributes={TextAttributes.BOLD}>
        {icons.icon('update')} Navigator updated
      </text>
      <text fg={theme().textMuted}>
        Changes from {props.previous} to {props.current}
      </text>
      <scrollbox
        height={Math.max(4, Math.min(16, Math.floor(dimensions().height / 2)))}
        scrollX={false}
        horizontalScrollbarOptions={{ visible: false }}
        verticalScrollbarOptions={{ visible: true }}
      >
        <box gap={1} paddingRight={1}>
          <For each={props.entries}>
            {(entry) => (
              <box gap={1}>
                <text fg={theme().accent} attributes={TextAttributes.BOLD}>
                  Navigator {entry.version}
                </text>
                <For each={entry.changes}>
                  {(change) => (
                    <text fg={theme().text} wrapMode="word">
                      {icons.icon('selected')} {change}
                    </text>
                  )}
                </For>
              </box>
            )}
          </For>
        </box>
      </scrollbox>
      <SelectionBox
        backgroundColor={theme().primary}
        paddingLeft={1}
        paddingRight={1}
        onMouseDown={(event) => event.stopPropagation()}
        onMouseUp={(event) => {
          event.stopPropagation()
          dialogs.back()
        }}
      >
        <text fg={theme().selectedListItemText}>Continue</text>
      </SelectionBox>
    </DialogSurface>
  )
}
