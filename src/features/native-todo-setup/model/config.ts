import type { ConfigDocument } from './types'

export function todoConfig(entries: readonly ConfigDocument[]) {
  let owner = -1

  for (const [index, entry] of entries.entries()) {
    if (entry.experimental !== undefined) owner = index
  }
  const enabled = owner >= 0 && entries[owner].experimental?.todo === true
  const candidates = owner >= 0 ? [entries[owner]] : entries
  const files = [
    ...new Set(candidates.flatMap((entry) => (entry.path && /\.jsonc?$/iu.test(entry.path) ? [entry.path] : []))),
  ]

  return {
    enabled,
    files,
    signature: JSON.stringify(entries),
    unavailable:
      files.length === 0
        ? 'OpenCode did not expose an editable JSON/JSONC source for its effective experimental settings.'
        : undefined,
  }
}
