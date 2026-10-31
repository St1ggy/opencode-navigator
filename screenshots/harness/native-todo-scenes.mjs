export function createNativeTodoScene(api, scene, services) {
  if (!scene.startsWith('native-todo-')) return

  const path = '/workspace/atlas-console/.opencode/opencode.jsonc'
  const enabled = scene === 'native-todo-enabled-empty'
  const model = services.createTodoSetupController({
    target: (sessionID) => ({ key: `${sessionID}:native-todo-fixture`, sessionID, routing: { directory: '/workspace/atlas-console' } }),
    route: () => JSON.stringify(api.route.current), signal: api.lifecycle.signal,
    source: {
      async entries() {
        if (scene === 'native-todo-config-error') throw new Error('Synthetic config read failure')

        return [{ path, experimental: { todo: enabled } }]
      },
      read: async () => '// Synthetic configuration\n{ "experimental": { "todo": false, "schedules": true } }\n',
      write: async () => { throw new Error('Screenshot fixtures never write configuration') },
      subscribe: () => () => {},
    },
  })
  let sessionID
  const setup = {
    state: model.state, refresh: model.refresh,
    configure(id) {
      sessionID = id
      services.createDialogStack(api).open(() => services.NativeTodoSetupDialog({ api, sessionID: id, model }))
    },
  }

  return {
    controller(id) {
      sessionID = id
      const context = { data: { session: { get: () => ({}), sync: async () => {}, message: { list: () => [], sync: async () => {} } } } }

      return { ...services.createNativeTodoController(context, api), setup }
    },
    open(dispatch, schedule = setTimeout) {
      if (!['native-todo-file-picker', 'native-todo-enable-preview', 'native-todo-config-error'].includes(scene)) return

      if (!sessionID) throw new Error('Synthetic native Todo sidebar did not mount')

      setup.configure(sessionID)

      if (scene === 'native-todo-enable-preview') schedule(() => dispatch('opencode-navigator.selection-menu.select'), 500)
    },
  }
}

export function openWizardScene(scene, dispatch, schedule = setTimeout) {
  const steps = {
    'setup-sections': 6, 'setup-monitoring': 1, 'setup-search-skills': 2,
    'setup-actions-lsp': 3, 'setup-mcp': 4, 'setup-customization': 5,
    'setup-v2-monitoring': 1, 'setup-v2-actions': 3,
  }[scene]

  if (steps === undefined) return

  schedule(() => { for (let index = 0; index < steps; index++) dispatch('opencode-navigator.wizard.select') }, 400)
}
