import { NativeTodoSetupDialog, createTodoSetupController } from '../../features/native-todo-setup'
import { createDialogStack } from '../../shared/ui'

import { createTodoSetupSource } from './todo-setup-source'

import type { PreferencesController } from '../../entities/preferences'
import type { NativeTodoSetup, TodoController } from '../../entities/todo'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { Plugin } from '@opencode/plugin/tui'

export function createOpenCodeV2TodoSetup(
  context: Plugin.Context,
  api: TuiPluginApi,
  preferences: PreferencesController,
  target: TodoController['target'],
): NativeTodoSetup {
  const model = createTodoSetupController({
    source: createTodoSetupSource(context),
    target,
    route: () => JSON.stringify(api.route.current),
    signal: api.lifecycle.signal,
  })

  const setup: NativeTodoSetup = {
    state: model.state,
    refresh: model.refresh,
    configure(sessionID) {
      if (model.state(sessionID).enableUnavailable) return

      const current = { target: target(sessionID), route: JSON.stringify(api.route.current) }

      createDialogStack(api, preferences.lspIconStyle, () => model.current(current), preferences.cornerFont).open(
        () => <NativeTodoSetupDialog api={api} sessionID={sessionID} model={model} />,
      )
    },
  }
  const sessionID = () => {
    const route = api.route.current

    if (route.name !== 'session') return

    const id = route.params?.sessionID

    return typeof id === 'string' ? id : undefined
  }

  context.keymap.layer(() => ({
    mode: 'global',
    commands: [
      {
        id: 'opencode-navigator.todo.enable',
        title: 'Enable native Todo',
        group: 'Navigator',
        palette: true,
        enabled: () => {
          const id = sessionID()

          const state = id ? model.state(id) : undefined

          return Boolean(state && state.enabled !== true && !state.enableUnavailable)
        },
        run: () => {
          const id = sessionID()

          if (id) setup.configure(id)
        },
      },
    ],
  }))

  return setup
}
