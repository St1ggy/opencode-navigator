import { TextAttributes } from '@opentui/core'
import { useTerminalDimensions } from '@opentui/solid'
import { Index, onCleanup } from 'solid-js'

import { DialogSurface, useIcons } from '../../../shared/ui'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { ScrollBoxRenderable } from '@opentui/core'

export type KeyboardHelpProps = { api: TuiPluginApi; shortcuts?: readonly { key: string; label: string }[] }

export function KeyboardHelpDialog(props: KeyboardHelpProps) {
  const dimensions = useTerminalDimensions()
  const icons = useIcons()
  let body: ScrollBoxRenderable | undefined
  const keys = ['up', 'down', 'pageup', 'pagedown']
  const unregister = props.api.keymap.registerLayer({
    mode: 'modal',
    commands: keys.map((_key, index) => ({
      name: `opencode-navigator.keyboard-help.scroll.${index}`,
      run: () => body?.scrollBy([-1, 1, -8, 8][index]),
    })),
    bindings: keys.map((key, index) => ({ key, cmd: `opencode-navigator.keyboard-help.scroll.${index}` })),
  })

  onCleanup(unregister)
  const theme = () => props.api.theme.current
  const hints = () => [
    `${icons.key('up')}/k and ${icons.key('down')}/j move · ${icons.key('enter')} activates`,
    `${icons.key('enter')} on a filter starts typing · ${icons.key('esc')} returns`,
    `Todo: ${icons.key('enter')} on All / Active / Finished changes the view`,
    `MCP: ${icons.key('enter')} toggles a group`,
    'Show all / Show less expands or limits the filtered list',
    `Skills: ${icons.key('enter')} shows description and source · ${icons.icon('recent')} marks recent skills`,
    'Navigator Settings: Ctrl+,',
    `Navigator shortcuts: ${props.shortcuts?.map(({ key, label }) => `${key} ${label}`).join(' · ') || 'use the configured sidebar shortcut'}`,
    `Search Everything: shortcut in Settings ${icons.icon('right')} Behavior`,
    `Search: type · ${icons.key('up/down')} results · ${icons.key('tab/shift+tab')} tabs · ${icons.key('enter')} run`,
    `${icons.key('esc')} leaves the sidebar · ${icons.key('?')} opens this help`,
  ]

  return (
    <DialogSurface api={props.api} lift>
      <text attributes={TextAttributes.BOLD} fg={theme().text}>
        {icons.icon('help')} Navigator keyboard help
      </text>
      <scrollbox
        id="opencode-navigator.keyboard-help.body"
        ref={(node) => {
          body = node
        }}
        height={Math.max(1, Math.min(16, dimensions().height - 13))}
        scrollX={false}
      >
        <Index each={hints()}>
          {(hint) => (
            <text fg={theme().textMuted} wrapMode="word">
              {hint()}
            </text>
          )}
        </Index>
      </scrollbox>
      <text fg={theme().textMuted}>
        {icons.key('up/down')} scroll · {icons.key('esc')} close
      </text>
    </DialogSurface>
  )
}
