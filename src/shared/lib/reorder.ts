export function reorderItems<T>(items: readonly T[], from: string, to: string, key: (item: T) => string): T[] {
  const source = items.findIndex((item) => key(item) === from)
  const target = items.findIndex((item) => key(item) === to)
  const next = [...items]

  if (source === -1 || target === -1 || source === target) return next

  const [item] = next.splice(source, 1)

  next.splice(target, 0, item)

  return next
}
