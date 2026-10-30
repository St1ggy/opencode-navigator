import { useTerminalDimensions } from '@opentui/solid'
import { For, Show, onCleanup } from 'solid-js'

import { DialogHeader, DialogSurface, useDialogScroll, useDialogs, useIcons } from '../../../shared/ui'

import type { ChangelogEntry } from '../../../entities/navigator-release'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { ScrollBoxRenderable } from '@opentui/core'

export function ChangelogVersionDialog(props: { api: TuiPluginApi; entry: ChangelogEntry }) {
  const dialogs = useDialogs(props.api)
  const icons = useIcons()
  const dimensions = useTerminalDimensions()
  const scroll = useDialogScroll()
  let body: ScrollBoxRenderable | undefined
  const keys = ['up', 'down', 'pageup', 'pagedown']
  const unregister = props.api.keymap.registerLayer({
    mode: 'modal',
    commands: keys.map((_key, index) => ({
      name: `opencode-navigator.changelog.scroll.${index}`,
      run: () => body?.scrollBy([-1, 1, -8, 8][index]),
    })),
    bindings: keys.map((key, index) => ({ key, cmd: `opencode-navigator.changelog.scroll.${index}` })),
  })

  onCleanup(unregister)

  return (
    <DialogSurface api={props.api} lift>
      <DialogHeader api={props.api} title={`Navigator ${props.entry.version}`} onBack={dialogs.back} />
      <text fg={props.api.theme.current.textMuted}>Release notes</text>
      <scrollbox
        id="opencode-navigator.changelog.body"
        ref={(node) => {
          body = node
          scroll.ref(node)
        }}
        height={Math.max(3, Math.min(16, dimensions().height - 13))}
        scrollX={false}
      >
        <box gap={1} paddingRight={1}>
          <Show
            when={props.entry.changes.length > 0}
            fallback={<text fg={props.api.theme.current.textMuted}>No user-facing changes in this version.</text>}
          >
            <For each={props.entry.changes}>
              {(change) => (
                <text wrapMode="word" fg={props.api.theme.current.text}>
                  {icons.icon('selected')} {change}
                </text>
              )}
            </For>
          </Show>
        </box>
      </scrollbox>
      <text fg={props.api.theme.current.textMuted}>
        {icons.key('up/down')} scroll · {icons.key('esc')} back
      </text>
    </DialogSurface>
  )
}
