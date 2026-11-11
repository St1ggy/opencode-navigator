import { createSignal, onCleanup, onMount } from 'solid-js'

export function createMeasuredToolbar() {
  const [width, setWidth] = createSignal(0)
  const [widths, setWidths] = createSignal<Record<string, number>>({})
  const [moreWidth, setMoreWidth] = createSignal(24)
  const nodes = new Map<string, HTMLElement>()
  let root: HTMLElement | undefined
  let more: HTMLElement | undefined
  let observer: ResizeObserver | undefined
  let disposed = false

  function measure() {
    if (disposed || !root || root.clientWidth === 0) return

    setWidth(Math.max(0, root.clientWidth - 8))
    setWidths((previous) => {
      const next = Object.fromEntries([...nodes].map(([key, node]) => [key, node.getBoundingClientRect().width]))

      return Object.keys(next).length === Object.keys(previous).length &&
        Object.entries(next).every(([key, value]) => previous[key] === value)
        ? previous
        : next
    })

    if (more) setMoreWidth(more.getBoundingClientRect().width)
  }

  onMount(() => {
    observer = new ResizeObserver(measure)

    if (root) observer.observe(root)

    if (more) observer.observe(more)

    for (const node of nodes.values()) observer.observe(node)
    measure()
  })
  onCleanup(() => {
    disposed = true
    observer?.disconnect()
    nodes.clear()
  })

  return {
    width,
    widths,
    moreWidth,
    root(node: HTMLElement) {
      if (root) observer?.unobserve(root)

      root = node
      observer?.observe(node)
      onCleanup(() => {
        observer?.unobserve(node)

        if (root === node) root = undefined
      })
      queueMicrotask(measure)
    },
    more(node: HTMLElement) {
      if (more) observer?.unobserve(more)

      more = node
      observer?.observe(node)
      onCleanup(() => {
        observer?.unobserve(node)

        if (more === node) more = undefined
      })
      queueMicrotask(measure)
    },
    button(key: string, node: HTMLElement | undefined) {
      const previous = nodes.get(key)

      if (previous) observer?.unobserve(previous)

      if (node) {
        nodes.set(key, node)
        observer?.observe(node)
      } else nodes.delete(key)

      queueMicrotask(measure)
    },
  }
}
