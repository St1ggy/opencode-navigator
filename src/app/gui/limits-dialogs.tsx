import { onCleanup } from 'solid-js'

import { GuiCodexAccountDialog } from '../../features/provider-limits/gui'
import { createCodexAccountLinkModel } from '../../features/provider-limits/model'

import { createSelectedSessionAccess } from './adapters/selected-session'
import { createGuiResetDialog } from './reset-dialog'

import type { PreferencesController } from '../../entities/preferences/model'
import type { MonitoringRegistry } from './monitoring-registry'
import type { Context } from '@opencode/plugin/gui'

export function createGuiLimitsDialogs(
  context: Context,
  registry: MonitoringRegistry,
  preferences: PreferencesController,
) {
  const access = createSelectedSessionAccess(() => context.sessions.current())

  return {
    resets: createGuiResetDialog(context, registry, preferences),
    linkAccount() {
      const scope = access.capture()
      const limits = registry.active()?.limits
      const adapter = limits?.codex

      if (!scope || !limits || !adapter || !preferences.ready()) return

      context.dialogs.open((dialog) => {
        const abort = new AbortController()

        onCleanup(() => abort.abort())
        const model = createCodexAccountLinkModel({
          adapter,
          selected: limits.selected,
          current: () => access.current(scope),
          signal: AbortSignal.any([context.signal, abort.signal, limits.controller.targetSignal()]),
          bind: preferences.saveCodexConnectionBinding,
        })

        return <GuiCodexAccountDialog ui={context.ui} model={model} close={dialog.close} />
      })
    },
  }
}
