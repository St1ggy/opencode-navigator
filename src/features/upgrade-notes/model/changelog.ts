import { isNewerVersion } from '../../../shared/lib/version'

export type ChangelogEntry = { version: string; changes: string[] }

export function changesSince(source: string, previous: string, current: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = []
  let entry: ChangelogEntry | undefined

  for (const line of source.split(/\r?\n/)) {
    const heading = /^## \[(\d+\.\d+\.\d+(?:-[\w.-]+)?)\]/.exec(line)

    if (heading) {
      entry =
        isNewerVersion(heading[1], previous) && !isNewerVersion(heading[1], current)
          ? { version: heading[1], changes: [] }
          : undefined

      if (entry) entries.push(entry)

      continue
    }

    if (entry && line.startsWith('- ')) entry.changes.push(line.slice(2))
  }

  return entries.filter((candidate) => candidate.changes.length > 0)
}

export async function readBundledChangelog() {
  const packaged = Bun.file(new URL('../CHANGELOG.md', import.meta.url))

  if (await packaged.exists()) return packaged.text()

  return Bun.file(new URL('../../../../CHANGELOG.md', import.meta.url)).text()
}
