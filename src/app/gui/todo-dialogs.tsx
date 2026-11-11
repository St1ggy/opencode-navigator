import { TodoArchiveDialog } from '../../entities/todo/gui'
import { normalizeTodoState } from '../../entities/todo/model'
import { LegacyTodoArchiveRpc } from '../../entities/todo/server'
import { TodoSetupDialog } from '../../features/native-todo-setup/gui'

import { createSelectedSessionAccess } from './adapters/selected-session'

import type { MonitoringRuntime } from '../../pages/navigator/model'
import type { Context } from '@opencode/plugin/gui'

export function createTodoDialogs(context: Context, runtime: () => MonitoringRuntime | undefined) {
  const access = createSelectedSessionAccess(() => context.sessions.current())

  return {
    enable() {
      const value = runtime()
      const scope = access.capture()
      const model = value?.todoSetup

      if (!value || !scope || !model) return

      context.dialogs.open((dialog) => (
        <TodoSetupDialog
          ui={context.ui}
          dialogs={context.dialogs}
          model={model}
          sessionID={scope.target.sessionID}
          current={() => access.current(scope)}
          close={dialog.close}
          enabled={() => {
            void value.todo.refresh(scope.target.sessionID)
            context.toast.show({ title: 'Native Todo enabled', variant: 'success' })
          }}
        />
      ))
    },
    archive() {
      const scope = access.capture()

      if (!scope) return

      async function load(signal: AbortSignal) {
        const request = access.read(scope!)
        const value = await request.client.rpc(LegacyTodoArchiveRpc).list(
          { sessionID: scope!.target.sessionID },
          {
            location: request.location,
            signal: AbortSignal.any([context.signal, signal, AbortSignal.timeout(15_000)]),
          },
        )

        if (!request.current()) throw new DOMException('Todo archive target changed', 'AbortError')

        return normalizeTodoState(value).todos
      }

      context.dialogs.open((dialog) => <TodoArchiveDialog ui={context.ui} close={dialog.close} load={load} />)
    },
  }
}
