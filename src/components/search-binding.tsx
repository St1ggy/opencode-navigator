import { createEffect, onCleanup } from 'solid-js'

import { LEGACY_PLUGIN_ID, SEARCH_COMMAND } from '../constants'
import { type SearchServices, openSearchEverything } from '../dialogs/search'
import { searchContext } from '../search'

import type { SidebarInteraction } from '../sidebar-interaction'

export function SearchBinding(props: SearchServices & { interaction: SidebarInteraction }) {
  const timers = new Set<ReturnType<typeof setTimeout>>()
  let isDisposed = false
  const unregister = props.api.keymap.registerLayer({
    mode: 'base',
    commands: [
      {
        name: SEARCH_COMMAND,
        title: 'Search Everything',
        category: 'Navigator',
        namespace: 'palette',
        enabled: () => ['home', 'session'].includes(props.api.route.current.name),
        run: () => {
          const context = searchContext(props.api).key
          const timer = setTimeout(() => {
            timers.delete(timer)

            if (
              isDisposed ||
              props.api.lifecycle?.signal.aborted ||
              searchContext(props.api).key !== context ||
              props.api.ui.dialog.open
            )
              return

            const target = props.interaction.ownsFocus()
              ? props.interaction.savedReturnTarget()
              : props.api.renderer.currentFocusedRenderable

            openSearchEverything(props, target ?? null)
          }, 50)

          timers.add(timer)
        },
      },
      {
        name: `${LEGACY_PLUGIN_ID}.search`,
        run() {
          props.api.keymap.dispatchCommand(SEARCH_COMMAND)
        },
      },
    ],
  })

  createEffect(() => {
    const key = props.preferences.searchKey()
    const remove = props.api.keymap.registerLayer({ mode: 'base', bindings: [{ key, cmd: SEARCH_COMMAND }] })

    onCleanup(remove)
  })
  onCleanup(() => {
    isDisposed = true
    unregister()
    for (const timer of timers) clearTimeout(timer)
  })

  return <box />
}
