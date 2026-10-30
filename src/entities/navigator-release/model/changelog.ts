import { isNewerVersion } from '../../../shared/lib/version'

export type ChangelogEntry = { version: string; changes: string[] }

export function parseChangelog(source: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = []
  let entry: ChangelogEntry | undefined

  for (const line of source.split(/\r?\n/)) {
    const heading = /^## \[(\d+\.\d+\.\d+(?:-[\w.-]+)?)\]/.exec(line)

    if (heading) {
      entry = { version: heading[1], changes: [] }
      entries.push(entry)
    } else if (line.startsWith('## ')) entry = undefined
    else if (entry && line.startsWith('- ')) entry.changes.push(line.slice(2))
  }

  return entries
}

export function changesSince(source: string, previous: string, current: string): ChangelogEntry[] {
  return parseChangelog(source).filter(
    (entry) =>
      entry.changes.length > 0 && isNewerVersion(entry.version, previous) && !isNewerVersion(entry.version, current),
  )
}

export async function readBundledChangelog() {
  const packaged = Bun.file(new URL('../CHANGELOG.md', import.meta.url))

  if (await packaged.exists()) return packaged.text()

  return Bun.file(new URL('../../../../CHANGELOG.md', import.meta.url)).text()
}
