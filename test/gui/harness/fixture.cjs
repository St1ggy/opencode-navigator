// The official GUI loader requires a single CommonJS entry, including this isolated test plugin.
// oxlint-disable-next-line typescript/no-require-imports
const { Plugin, Command, Slot } = require('@opencode/plugin/gui')

module.exports.default = Plugin.define({
  main(context) {
    if (!context.options.captureClock) return

    // Capture-only fixture: quota snapshots are timestamped in Desktop main,
    // outside Playwright's renderer clock. Timers remain real in both processes.
    const previous = Date.now

    Date.now = () => Date.parse('2026-11-01T12:00:00Z')
    context.signal.addEventListener(
      'abort',
      () => {
        Date.now = previous
      },
      { once: true },
    )
  },
  setup(context) {
    context.add(Command, {
      id: 'ping',
      title: 'Synthetic fixture ping',
      run() {
        context.toast.show({ title: 'Synthetic fixture ready', variant: 'success' })
      },
    })
    function nativeDialog() {
      context.dialogs.open((handle) =>
        context.ui.Dialog({
          title: 'Synthetic native dialog',
          children: 'Native dialog contract probe',
          footer: context.ui.Button({ children: 'Close synthetic dialog', onClick: handle.close }),
        }),
      )
    }

    if (context.options.nativeDialogProbe)
      context.add(Slot, {
        at: 'window.bottom',
        render: () => [
          context.ui.Button({ children: 'Open synthetic native dialog', onClick: nativeDialog }),
          context.ui.Menu({
            label: 'Synthetic probe menu',
            items: [{ label: 'Open probe dialog', onSelect: nativeDialog }],
          }),
          context.ui.Tooltip({
            value: 'Synthetic hover hint',
            children: context.ui.Button({ children: 'Synthetic tooltip button' }),
          }),
        ],
      })

    if (!context.options.nativeDialogProbe)
      context.add(Slot, {
        at: 'window.bottom',
        render: () =>
          context.ui.Menu({
            label: 'Synthetic fixture commands',
            items: [
              ['Configure Navigator toolbar', 'opencode-navigator.todo-server.toolbar'],
              ['Navigator settings', 'opencode-navigator.todo-server.settings'],
              ['Search Everything in Navigator', 'opencode-navigator.todo-server.search'],
              ['Synthetic Todo states', 'navigator-desktop-fixture.todo-states'],
              ['Synthetic update stages', 'navigator-desktop-fixture.update-stages'],
              ['Float Navigator', 'opencode-navigator.todo-server.float'],
              ['Close synthetic fixture tabs', 'navigator-desktop-fixture.home'],
              ['Select synthetic quota model', 'navigator-desktop-fixture.quota'],
            ].map(([label, id]) => ({
              label,
              onSelect: () => {
                if (!context.commands.run(id)) throw new Error(`Synthetic command dispatch failed: ${id}`)
              },
            })),
          }),
      })

    context.add(Command, {
      id: 'quota',
      title: 'Select synthetic quota model',
      async run() {
        if (!context.options.quotaFixture) throw new Error('Synthetic quota mode is not enabled')

        const session = context.sessions.current()

        if (!session) throw new Error('Synthetic session unavailable')

        await session.server.client.credential.create({
          integrationID: 'openai',
          activate: true,
          value: {
            type: 'oauth',
            methodID: 'chatgpt-browser',
            access: 'synthetic-access',
            refresh: 'synthetic-refresh',
            expires: 1_900_000_000_000,
            metadata: {},
          },
        })
        const data = session.server.data.location

        await Promise.all([
          data.provider.sync(session.location),
          data.model.sync(session.location),
          data.integration.sync(session.location),
        ])

        if (!context.screen.current()?.composer.setModel({ providerID: 'synthetic-codex', modelID: 'synthetic-model' }))
          throw new Error('Synthetic quota model selection failed')
      },
    })
    context.add(Command, {
      id: 'home',
      title: 'Close synthetic fixture tabs',
      run() {
        for (const tab of context.tabs.list()) context.tabs.close(tab.key)
      },
    })
    context.add(Command, {
      id: 'create',
      title: 'Create synthetic monitoring session',
      async run() {
        const server = context.servers.get('sidecar')

        if (!server) throw new Error('Isolated Desktop sidecar unavailable')

        const location = { directory: '/synthetic/project' }
        const parent = await server.client.session.create({
          title: 'Synthetic monitoring session with a deliberately long title for header layout regressions',
          location,
        })

        await server.client.session.create({ title: 'Synthetic child session', parentID: parent.id, location })
        context.tabs.open({ server: server.id, id: parent.id }, { focus: true })
      },
    })
  },
})
