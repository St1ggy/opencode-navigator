export function toolbarLayout(keys: readonly string[], width: number, mode: 'menu' | 'wrap') {
  const columns = Math.max(1, Math.floor((Math.max(3, width) + 1) / 4))
  const shown = mode === 'wrap' || keys.length <= columns ? keys.length : Math.max(0, columns - 1)
  const visible = keys.slice(0, shown)
  const overflow = keys.slice(shown)
  const controls = [...visible, ...(overflow.length > 0 ? ['toolbar:more'] : [])]

  return {
    columns,
    overflow,
    rows: Array.from({ length: Math.ceil(controls.length / columns) }, (_, row) =>
      controls.slice(row * columns, (row + 1) * columns),
    ),
  }
}
