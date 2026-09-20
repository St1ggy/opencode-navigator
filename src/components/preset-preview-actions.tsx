import { Show } from 'solid-js'

import { useIcons } from '../icons/context'

import { DialogAction } from './dialog-action'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export type PreviewAction = 'cancel' | 'apply'
export function PresetPreviewActions(props: {
  api: TuiPluginApi
  prefix: string
  active: PreviewAction
  disabled: boolean
  onSelect: (action: PreviewAction) => void
  onActivate: (action: PreviewAction) => void
  onRefresh?: () => void
}) {
  const icons = useIcons()

  return (
    <box flexDirection="row" justifyContent="space-between">
      <box flexGrow={1}>
        <Show when={props.onRefresh}>
          <text
            fg={props.api.theme.current.accent}
            onMouseUp={(event) => {
              event.stopPropagation()
              props.onRefresh?.()
            }}
          >
            {icons.icon('retry')} Refresh ({icons.key('ctrl+r')})
          </text>
        </Show>
      </box>
      <box flexDirection="row" gap={1}>
        <DialogAction
          api={props.api}
          id={`${props.prefix}.cancel`}
          label="Cancel"
          icon="close"
          selected={props.active === 'cancel'}
          onSelect={() => props.onSelect('cancel')}
          onActivate={() => props.onActivate('cancel')}
        />
        <DialogAction
          api={props.api}
          id={`${props.prefix}.apply`}
          label="Apply"
          icon="done"
          selected={props.active === 'apply'}
          disabled={props.disabled}
          onSelect={() => props.onSelect('apply')}
          onActivate={() => props.onActivate('apply')}
        />
      </box>
    </box>
  )
}
