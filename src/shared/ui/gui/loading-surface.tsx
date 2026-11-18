import { For, Show, createEffect, createSignal, on, onCleanup, onMount, untrack } from 'solid-js'

import { readLoadingLayout } from './loading-layout'

import type { LoadingLayout } from './loading-layout'
import type { JSX } from 'solid-js'

export function GuiLoadingSurface(props: {
  loading: boolean
  label: string
  saved?: LoadingLayout
  remember?(layout: LoadingLayout): void
  children: JSX.Element
}) {
  let content!: HTMLDivElement
  let frame: number | undefined
  const [layout, setLayout] = createSignal<LoadingLayout>()
  const measure = () => {
    if (!content.isConnected || !content.getBoundingClientRect().width) return

    const current = readLoadingLayout(content)

    if (props.loading) {
      const saved = props.saved

      if (!layout() || Math.abs(layout()!.width - current.width) > 1)
        setLayout(saved && Math.abs(saved.width - current.width) <= 1 ? saved : current)
    } else {
      setLayout(current)
      props.remember?.(current)
    }
  }
  const schedule = () => {
    if (frame !== undefined) return

    frame = requestAnimationFrame(() => {
      frame = undefined
      untrack(measure)
    })
  }

  onMount(() => {
    measure()
    const observer = new ResizeObserver(schedule)
    const mutations = new MutationObserver(schedule)

    observer.observe(content)
    mutations.observe(content, { childList: true, characterData: true, subtree: true })
    onCleanup(() => {
      observer.disconnect()
      mutations.disconnect()

      if (frame !== undefined) cancelAnimationFrame(frame)
    })
  })
  createEffect(on(() => props.loading, schedule))

  return (
    <div
      aria-busy={props.loading}
      data-loading-surface
      style={{
        position: 'relative',
        'min-width': '0',
        height: props.loading && layout() ? `${layout()!.height}px` : undefined,
        overflow: props.loading ? 'hidden' : undefined,
      }}
    >
      <div
        ref={(node) => {
          content = node
        }}
        inert={props.loading}
        aria-hidden={props.loading || undefined}
        style={{ visibility: props.loading ? 'hidden' : undefined, display: 'flow-root' }}
      >
        {props.children}
      </div>
      <Show when={props.loading}>
        <div role="status" aria-label={props.label} data-loading-skeleton style={{ position: 'absolute', inset: '0' }}>
          <For each={layout()?.rects ?? []}>
            {(rect) => (
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: `${rect.x}px`,
                  top: `${rect.y}px`,
                  width: `${rect.width}px`,
                  height: `${rect.height}px`,
                  'border-radius': '3px',
                  background: 'var(--v2-text-text-muted)',
                  opacity: '0.16',
                }}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}
