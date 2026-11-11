import { createEffect, createSignal, onCleanup } from 'solid-js'

export function createSortableInteraction(props: {
  keys(): readonly string[]
  scope(): string
  disabled(): boolean
  root(): HTMLElement
  move(from: string, to: string): void
}) {
  const [source, setSource] = createSignal<string>()
  const [target, setTarget] = createSignal<string>()
  const [announcement, setAnnouncement] = createSignal('')
  let drag: { id: string; pointer: number; scope: string; keys: string } | undefined
  const signature = () => JSON.stringify(props.keys())

  function cancel() {
    const previous = drag

    drag = undefined
    setSource(undefined)
    setTarget(undefined)

    if (previous && previous.pointer >= 0 && props.root().hasPointerCapture(previous.pointer))
      props.root().releasePointerCapture(previous.pointer)
  }
  createEffect(() => {
    source()

    if (drag && (props.disabled() || props.scope() !== drag.scope || signature() !== drag.keys)) cancel()
  })
  function escape(event: KeyboardEvent) {
    if (event.key !== 'Escape') return

    event.preventDefault()
    event.stopPropagation()
    cancel()
  }
  createEffect(() => {
    if (!source()) return

    globalThis.window.addEventListener('keydown', escape, { capture: true })
    onCleanup(() => globalThis.window.removeEventListener('keydown', escape, true))
  })
  onCleanup(cancel)

  function hover(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointer) return

    const node = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-sortable-item]')

    setTarget(node && props.root().contains(node) ? node.dataset.sortableItem : undefined)
  }
  function start(event: PointerEvent, id: string) {
    if (event.button !== 0 || props.disabled() || drag) return

    event.preventDefault()
    event.stopPropagation()
    drag = { id, pointer: event.pointerId, scope: props.scope(), keys: signature() }
    props.root().setPointerCapture(event.pointerId)
    setSource(id)
    setTarget(id)
  }
  function end(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointer) return

    hover(event)
    const current = drag
    const destination = target()
    const valid = !props.disabled() && props.scope() === current.scope && signature() === current.keys

    cancel()

    if (valid && destination && current.id !== destination) props.move(current.id, destination)
  }
  function key(event: KeyboardEvent, id: string) {
    if (event.key === 'Escape') {
      if (drag) {
        event.preventDefault()
        event.stopPropagation()
        cancel()
      }

      return
    }

    if (props.disabled()) return

    if ([' ', 'Enter'].includes(event.key) && !event.repeat) {
      event.preventDefault()
      event.stopPropagation()

      if (!drag) {
        drag = { id, pointer: -1, scope: props.scope(), keys: signature() }
        setSource(id)
        setTarget(id)
        setAnnouncement('Picked up. Use arrow keys, Space to drop, or Escape to cancel.')
      } else if (drag.pointer === -1 && drag.id === id) {
        const destination = target()
        const valid = props.scope() === drag.scope && signature() === drag.keys

        cancel()

        if (valid && destination && destination !== id) props.move(id, destination)
      }

      return
    }

    if (drag?.pointer !== -1 || drag.id !== id || !['ArrowUp', 'ArrowDown'].includes(event.key)) return

    const keys = props.keys()
    const index = keys.indexOf(target() ?? id)
    const destination = keys[index + (event.key === 'ArrowUp' ? -1 : 1)]

    if (!destination || index === -1) return

    event.preventDefault()
    event.stopPropagation()
    setTarget(destination)
    setAnnouncement(`Drop at position ${keys.indexOf(destination) + 1} of ${keys.length}`)
  }

  return { source, target, announcement, start, hover, end, key, cancel }
}
