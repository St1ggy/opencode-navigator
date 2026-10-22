import { createDialogStack } from '../../../shared/ui'
import { KeyboardHelpDialog } from '../ui/keyboard-help-loader'

import type { IconStyle } from '../../../shared/ui'
import type { KeyboardHelpProps } from '../ui/keyboard-help-dialog'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function openKeyboardHelp(
  api: TuiPluginApi,
  iconStyle: () => IconStyle = () => 'nerd',
  multilineCorners: () => boolean = () => true,
  shortcuts: KeyboardHelpProps['shortcuts'] = [],
) {
  createDialogStack(api, iconStyle, () => true, multilineCorners).open(() => (
    <KeyboardHelpDialog api={api} shortcuts={shortcuts} />
  ))
}
