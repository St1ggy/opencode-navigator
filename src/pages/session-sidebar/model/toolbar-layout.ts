export function toolbarLayout(
  keys: readonly string[],
  width: number,
  mode: 'menu' | 'wrap',
  widths?: ReadonlyMap<string, number>,
) {
  const capacity = Math.max(3, Math.floor(width))
  const columns = Math.max(1, Math.floor((capacity + 1) / 4))
  const sizes: Record<string, number> = {}
  const size = (key: string) => Math.max(3, Math.min(capacity, widths?.get(key) ?? 3))
  const rows: string[][] = []
  let overflow: string[] = []

  if (mode === 'wrap') {
    let used = 0

    for (const key of keys) {
      const value = size(key)

      if (rows.length === 0 || (used > 0 && used + 1 + value > capacity)) {
        rows.push([])
        used = 0
      }

      rows.at(-1)!.push(key)
      sizes[key] = value
      used += (used ? 1 : 0) + value
    }
  } else if (keys.length > 0) {
    const fits = keys.reduce((total, key) => total + size(key), 0) + keys.length - 1 <= capacity
    const visible: string[] = []
    let used = 0

    for (const key of keys) {
      const remaining = (fits ? capacity : capacity - 4) - used - (visible.length > 0 ? 1 : 0)

      if (remaining < 3) break

      sizes[key] = Math.min(size(key), remaining)
      used += (visible.length > 0 ? 1 : 0) + sizes[key]
      visible.push(key)
    }
    overflow = keys.slice(visible.length)

    if (overflow.length > 0) {
      visible.push('toolbar:more')
      sizes['toolbar:more'] = 3
    }

    rows.push(visible)
  }

  return { columns, overflow, rows, ...(widths && { sizes }) }
}
