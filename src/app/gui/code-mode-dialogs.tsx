import { GuiExecuteDetails, GuiRoutingDialog } from '../../features/code-mode/gui'

import type { MonitoringRegistry } from './monitoring-registry'
import type { Context } from '@opencode/plugin/gui'

export function createCodeModeDialogs(context: Context, registry: MonitoringRegistry) {
  return {
    run(id: string) {
      const model = registry.active()?.codeMode
      const run = model?.runs().find((entry) => entry.id === id)

      if (model && run)
        context.dialogs.open((dialog) => (
          <GuiExecuteDetails
            ui={context.ui}
            now={model.now}
            run={() => model.runs().find((entry) => entry.id === id) ?? run}
            close={dialog.close}
          />
        ))
    },
    routing(server: string) {
      const model = registry.active()?.codeMode

      if (model)
        context.dialogs.open((dialog) => (
          <GuiRoutingDialog ui={context.ui} model={model} server={server} close={dialog.close} />
        ))
    },
  }
}
