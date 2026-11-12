import type { ChangelogEntry, UpdateProgress } from '../../../../entities/navigator-release/model'

export type GuiAboutServices = {
  version: string
  hostVersion: string
  changelog: readonly ChangelogEntry[]
  status(): string
  busy(): boolean
  available(): boolean
  check(): Promise<void>
  update(): Promise<void>
  report(): void
  progress?(): UpdateProgress | undefined
  checking?(): boolean
  latest?(): string | undefined
  restart?(): boolean
}
