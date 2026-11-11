import { onMount } from 'solid-js'

import { NavigatorGuiContext } from './context'
import { NavigatorSections } from './sections'
import { NavigatorPinnedToolbar } from './toolbar'

import type { NavigatorGuiServices } from './context'

export function MonitoringContent(
  props: NavigatorGuiServices & {
    scrollTop?: number
    onScroll?(top: number): void
  },
) {
  let body: HTMLDivElement | undefined

  onMount(() => {
    if (body) body.scrollTop = props.scrollTop ?? 0
  })

  return (
    <NavigatorGuiContext.Provider value={props}>
      <div
        ref={(node) => {
          body = node
        }}
        onScroll={(event) => props.onScroll?.(event.currentTarget.scrollTop)}
        data-navigator-content
        style={{ padding: '12px', 'overflow-y': 'auto', 'min-height': '0', flex: '1', 'font-size': '13px' }}
      >
        <NavigatorPinnedToolbar />
        <NavigatorSections />
      </div>
    </NavigatorGuiContext.Provider>
  )
}
