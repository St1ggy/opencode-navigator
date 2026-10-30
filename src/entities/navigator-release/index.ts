export { parseChangelog, changesSince, readBundledChangelog, type ChangelogEntry } from './model/changelog'

export type NavigatorUpdateCheck = {
  status: 'idle' | 'checking' | 'current' | 'available' | 'error'
  latest?: string
  checkedAt?: number
}
