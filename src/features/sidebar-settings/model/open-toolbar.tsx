import { toolbarPinKey } from '../../../entities/preferences'
import { createDialogStack } from '../../../shared/ui'
import { ToolbarManager } from '../ui/toolbar-manager'
import { ToolbarPinDialog } from '../ui/toolbar-pin-dialog'

import type { ToolbarPinSettings, ToolbarSettings } from './toolbar-settings'

function navigation(input: ToolbarSettings) {
  const route = JSON.stringify(input.api.route.current)

  return (
    input.dialogs ??
    createDialogStack(
      input.api,
      input.preferences.lspIconStyle,
      () => route === JSON.stringify(input.api.route.current),
      input.preferences.cornerFont,
    )
  )
}

export function openToolbarPin(input: ToolbarPinSettings) {
  const dialogs = navigation(input)
  const current = input.preferences.toolbarPins().find((pin) => toolbarPinKey(pin) === toolbarPinKey(input.pin))

  dialogs.open(
    () => <ToolbarPinDialog {...input} pin={current ?? input.pin} expected={current && JSON.stringify(current)} />,
    'large',
  )
}

export function openToolbarManager(input: ToolbarSettings) {
  navigation(input).open(() => <ToolbarManager {...input} />, 'large')
}
