import { lazy } from 'solid-js'

import type { ShortcutHintProps } from './shortcut-hint'
import type { JSX } from 'solid-js'

export const SidebarShortcutHint = lazy(() => {
  const path = import.meta.url.includes('/dist/tui.js') ? './sidebar-shortcuts.js' : '../../../sidebar-shortcuts'

  return import(path) as Promise<{ default: (props: ShortcutHintProps) => JSX.Element }>
})
