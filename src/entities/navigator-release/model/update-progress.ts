export type UpdateProgress = {
  phase: 'preparing' | 'downloading' | 'installing' | 'verifying'
  received?: number
  total?: number
}

export function updateProgressView(progress: UpdateProgress) {
  const labels = {
    preparing: 'Preparing',
    downloading: 'Downloading',
    installing: 'Downloading / installing',
    verifying: 'Verifying',
  }
  const known =
    progress.total !== undefined &&
    Number.isFinite(progress.total) &&
    progress.total > 0 &&
    progress.received !== undefined &&
    Number.isFinite(progress.received) &&
    progress.received >= 0
  const fraction = known ? Math.min(1, progress.received! / progress.total!) : undefined
  const label =
    fraction === undefined ? labels[progress.phase] : `${labels[progress.phase]} ${Math.floor(fraction * 100)}%`

  return { label, fraction }
}
