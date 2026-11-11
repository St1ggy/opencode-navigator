export function fitToolbarButtons(width: number, widths: readonly number[], moreWidth: number, gap = 4) {
  const available = Number.isFinite(width) ? Math.max(0, width) : 0

  if (available === 0) return 0

  const spacing = Number.isFinite(gap) ? Math.max(0, gap) : 4
  const bounded = widths.map((value) => Math.min(available, Number.isFinite(value) ? Math.max(0, value) : available))

  if (bounded.reduce((sum, value) => sum + value, 0) + Math.max(0, bounded.length - 1) * spacing <= available)
    return bounded.length

  let used = Number.isFinite(moreWidth) ? Math.min(available, Math.max(0, moreWidth)) : available
  let count = 0

  for (const value of bounded) {
    if (used + spacing + value > available) break

    used += spacing + value
    count++
  }

  return count
}
