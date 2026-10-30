import { createSignal } from 'solid-js'

import type { BugReportTransport } from './github-bug-report'
import type { ChangelogEntry, NavigatorUpdateCheck } from '../../../entities/navigator-release'
import type { DialogNavigation } from '../../../shared/ui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { Accessor } from 'solid-js'

export type NavigatorAboutServices = {
  navigatorVersion: string
  openCodeVersion: string
  checkState: Accessor<NavigatorUpdateCheck>
  checking: Accessor<boolean>
  updating: Accessor<boolean>
  installed?: Accessor<string | undefined>
  check(): Promise<unknown>
  update(dialogs: DialogNavigation): void
  changelog(): Promise<ChangelogEntry[]>
  bugReportTransport?: BugReportTransport
}

const services = new WeakMap<TuiPluginApi, ReturnType<typeof createSlot>>()

function createSlot() {
  const [read, write] = createSignal<NavigatorAboutServices>()

  return { read, write }
}

function slot(api: TuiPluginApi) {
  let entry = services.get(api)

  if (!entry) {
    entry = createSlot()
    services.set(api, entry)
  }

  return entry
}

export function registerNavigatorAboutServices(api: TuiPluginApi, value: NavigatorAboutServices) {
  const entry = slot(api)

  entry.write(value)

  return () => {
    if (entry.read() === value) entry.write(undefined)
  }
}

export function getNavigatorAboutServices(api: TuiPluginApi) {
  return slot(api).read()
}
