import { type Accessor, createComputed, createMemo, createSignal, untrack } from 'solid-js'

export function createListVisibility<T>(options: {
  items: Accessor<readonly T[]>
  limit: Accessor<number>
  resetKey: Accessor<string>
}) {
  const [expanded, setExpanded] = createSignal(false)
  let previousKey: string | undefined
  let previousLimit: number | undefined
  const canToggle = createMemo(() => options.limit() > 0 && options.items().length > options.limit())

  createComputed(() => {
    const key = options.resetKey()
    const limit = options.limit()
    const isToggle = canToggle()

    if (key !== previousKey || limit !== previousLimit || !isToggle) untrack(() => setExpanded(false))

    previousKey = key
    previousLimit = limit
  })
  const visible = createMemo(() =>
    !canToggle() || expanded() ? options.items() : options.items().slice(0, options.limit()),
  )

  return {
    visible,
    expanded,
    canToggle,
    hiddenCount: () => options.items().length - visible().length,
    showAll: () => setExpanded(canToggle()),
    showLess: () => setExpanded(false),
  }
}

export type ListVisibility = ReturnType<typeof createListVisibility>
