export { parseChangelog, changesSince } from './changelog-data'
export type { ChangelogEntry } from './changelog-data'

export async function readBundledChangelog() {
  const packaged = Bun.file(new URL('../CHANGELOG.md', import.meta.url))

  if (await packaged.exists()) return packaged.text()

  return Bun.file(new URL('../../../../CHANGELOG.md', import.meta.url)).text()
}
