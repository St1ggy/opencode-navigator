import { createEffect, onCleanup, onMount } from 'solid-js'

import { clampMiniWindow, defaultMiniWindow } from '../../model'

import type { MiniWindowRect } from '../../model'

export function miniWindowViewport() {
  const visual = globalThis.window.visualViewport

  return {
    width: visual?.width ?? globalThis.window.innerWidth,
    height: visual?.height ?? globalThis.window.innerHeight,
  }
}

export function createMiniWindowInteraction(props: {
  rect: MiniWindowRect
  modal: boolean
  setRect(rect: MiniWindowRect): void
}) {
  const update = (rect: MiniWindowRect) => props.setRect(clampMiniWindow(rect, miniWindowViewport()))
  let drag:
    | { mode: 'move' | 'resize'; x: number; y: number; rect: MiniWindowRect; pointer: number; target: HTMLElement }
    | undefined
  const resize = () => update(props.rect)
  const end = (event?: PointerEvent) => {
    if (event && drag?.pointer !== event.pointerId) return

    const previous = drag

    drag = undefined

    if (previous?.target.hasPointerCapture(previous.pointer)) previous.target.releasePointerCapture(previous.pointer)
  }

  createEffect(() => {
    if (props.modal) end()
  })

  onMount(() => {
    globalThis.window.addEventListener('resize', resize)
    globalThis.window.visualViewport?.addEventListener('resize', resize)
    resize()
  })
  onCleanup(() => {
    globalThis.window.removeEventListener('resize', resize)
    globalThis.window.visualViewport?.removeEventListener('resize', resize)
    end()
  })

  function start(event: PointerEvent, mode: 'move' | 'resize') {
    if (event.button !== 0 || props.modal || drag) return

    event.preventDefault()
    event.stopPropagation()
    const target = event.currentTarget as HTMLElement

    target.setPointerCapture(event.pointerId)
    drag = { mode, x: event.clientX, y: event.clientY, rect: { ...props.rect }, pointer: event.pointerId, target }
  }
  function move(event: PointerEvent) {
    if (!drag || props.modal || drag.pointer !== event.pointerId) return

    const x = event.clientX - drag.x
    const y = event.clientY - drag.y

    update(
      drag.mode === 'move'
        ? { ...drag.rect, x: drag.rect.x + x, y: drag.rect.y + y }
        : { ...drag.rect, width: drag.rect.width + x, height: drag.rect.height + y },
    )
  }
  function key(event: KeyboardEvent, mode: 'move' | 'resize') {
    if (props.modal || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return

    event.preventDefault()
    event.stopPropagation()
    const step = event.shiftKey ? 10 : 1
    const x = ({ ArrowLeft: -step, ArrowRight: step } as Record<string, number>)[event.key] ?? 0
    const y = ({ ArrowUp: -step, ArrowDown: step } as Record<string, number>)[event.key] ?? 0

    update(
      mode === 'move'
        ? { ...props.rect, x: props.rect.x + x, y: props.rect.y + y }
        : { ...props.rect, width: props.rect.width + x, height: props.rect.height + y },
    )
  }

  return { start, move, key, end, reset: () => props.setRect(defaultMiniWindow(miniWindowViewport())) }
}
