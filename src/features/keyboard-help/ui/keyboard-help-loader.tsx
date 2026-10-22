import { Suspense, lazy } from 'solid-js'

import type { KeyboardHelpProps } from './keyboard-help-dialog'
import type { JSX } from 'solid-js'

const HelpView = lazy(async () => {
  const path = import.meta.url.includes('/dist/tui.js') ? './sidebar-shortcuts.js' : '../../../sidebar-shortcuts'
  const module = (await import(path)) as { KeyboardHelpDialog: (props: KeyboardHelpProps) => JSX.Element }

  return { default: module.KeyboardHelpDialog }
})

export function KeyboardHelpDialog(props: KeyboardHelpProps) {
  return (
    <box>
      <Suspense>
        <HelpView {...props} />
      </Suspense>
    </box>
  )
}
