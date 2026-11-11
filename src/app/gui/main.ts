import { createMainAccountReader } from './adapters/main-account'
import { createMainBugReport } from './adapters/main-bug-report'
import { createMainCodexHandlers } from './adapters/main-codex'
import { createMainPluginUpdate } from './adapters/main-plugin-update'
import { createMainPreferencesHandlers, desktopPreferencesStore } from './adapters/main-preferences'
import { createNodeCodexClient } from './adapters/node-codex'
import { bugReportIpc } from './ipc/bug-report'
import { localAccountIpc } from './ipc/local-account'
import { localCodexIpc } from './ipc/local-codex'
import { pluginUpdateIpc } from './ipc/plugin-update'
import { preferencesIpc } from './ipc/preferences'

import type { Plugin } from '@opencode/plugin/gui/main'

export const main: Plugin.MainSetup = (context) => {
  const store = desktopPreferencesStore()
  const readAccount = createMainAccountReader(context)
  const codex = createNodeCodexClient({ version: __NAVIGATOR_VERSION__ })

  context.onCleanup(codex.dispose)
  context.provide(preferencesIpc(context.id), createMainPreferencesHandlers(store))
  context.provide(localAccountIpc(context.id), { read: readAccount })
  context.provide(localCodexIpc(context.id), createMainCodexHandlers(context, store, codex))
  context.provide(pluginUpdateIpc(context.id), createMainPluginUpdate(context))
  context.provide(bugReportIpc(context.id), createMainBugReport(context.signal))
  context.log.write('info', `Navigator ${__NAVIGATOR_VERSION__} Desktop main ready`)
}
