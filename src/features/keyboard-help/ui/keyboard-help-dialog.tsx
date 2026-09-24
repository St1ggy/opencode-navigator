import { TextAttributes } from '@opentui/core'
import { Index } from 'solid-js'

import { DialogSurface, createDialogStack, useIcons } from '../../../shared/ui'

import type { IconStyle } from '../../../shared/ui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function KeyboardHelpDialog(props: { api: TuiPluginApi }) {
  const icons = useIcons()
  const theme = () => props.api.theme.current
  const hints = () => [
    `${icons.key('up')}/k and ${icons.key('down')}/j move · ${icons.key('enter')} activates`,
    `${icons.key('enter')} on a filter starts typing · ${icons.key('esc')} returns`,
    `Todo: ${icons.key('enter')} on All / Active / Finished changes the view`,
    'Show all / Show less expands or limits the filtered list',
    `Skills: ${icons.icon('info')} opens source · ${icons.icon('recent')} marks recent skills`,
    'Navigator Settings: Ctrl+,',
    `Search Everything: shortcut in Settings ${icons.icon('right')} Behavior`,
    `Search: type · ${icons.key('up/down')} results · ${icons.key('tab/shift+tab')} tabs · ${icons.key('enter')} run`,
    `${icons.key('esc')} leaves the sidebar · ${icons.key('?')} opens this help`,
  ]

  return (
    <DialogSurface api={props.api}>
      <text attributes={TextAttributes.BOLD} fg={theme().text}>
        {icons.icon('help')} Navigator keyboard help
      </text>
      <Index each={hints()}>
        {(hint) => (
          <text fg={theme().textMuted} wrapMode="word">
            {hint()}
          </text>
        )}
      </Index>
    </DialogSurface>
  )
}

export function openKeyboardHelp(
  api: TuiPluginApi,
  iconStyle: () => IconStyle = () => 'nerd',
  multilineCorners: () => boolean = () => true,
) {
  createDialogStack(api, iconStyle, () => true, multilineCorners).open(() => <KeyboardHelpDialog api={api} />)
}
