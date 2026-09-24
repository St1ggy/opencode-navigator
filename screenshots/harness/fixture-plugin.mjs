import navigator from '/workspace/dist/tui.js'

const FIXTURE_NOW = 1_893_456_000_000
const DIRECTORY = '/workspace/atlas-console'
const WORKTREE = '/workspace/atlas-console'
const WORKSPACE_ID = 'workspace-atlas'
const SCENE = process.env.SCREENSHOT_SCENE ?? 'hero'

const todos = [
  { content: 'Map keyboard and mouse navigation', status: 'completed', priority: 'high' },
  { content: 'Build deterministic screenshot fixtures', status: 'in_progress', priority: 'high' },
  { content: 'Review rounded section surfaces', status: 'pending', priority: 'medium' },
  { content: 'Publish release notes', status: 'cancelled', priority: 'low' },
]

const childSessions = [
  {
    id: 'session-worker-review',
    parentID: 'session-fixture-main',
    title: 'Review interaction regressions',
    directory: DIRECTORY,
    workspaceID: WORKSPACE_ID,
    time: { created: FIXTURE_NOW - 123_000, updated: FIXTURE_NOW - 3000 },
  },
  {
    id: 'session-worker-docs',
    parentID: 'session-fixture-main',
    title: 'Refresh public documentation',
    directory: DIRECTORY,
    workspaceID: WORKSPACE_ID,
    time: { created: FIXTURE_NOW - 75_000, updated: FIXTURE_NOW - 2000 },
  },
]

const statuses = {
  'session-worker-review': { type: 'busy' },
  'session-worker-docs': {
    type: 'retry',
    attempt: 2,
    message: 'Synthetic rate limit',
    next: FIXTURE_NOW + 45_000,
  },
}

const skills = [
  {
    name: 'review-changes',
    description: 'Review a change set for regressions and missing coverage',
    location: `${DIRECTORY}/.opencode/skills/review-changes/SKILL.md`,
    content: '# Review changes\nUse repository conventions and report findings first.',
  },
  {
    name: 'release-check',
    description: 'Verify package, release, and CI state before publication',
    location: `${DIRECTORY}/.opencode/skills/release-check/SKILL.md`,
    content: '# Release check\nVerify every public artifact before reporting completion.',
  },
  {
    name: 'write-docs',
    description: 'Prepare concise public documentation from synthetic examples',
    location: `${DIRECTORY}/.opencode/skills/write-docs/SKILL.md`,
    content: '# Write docs\nKeep examples deterministic and safe to publish.',
  },
]

const mcpStatuses =
  SCENE === 'mcp-error'
    ? {
        metrics: {
          status: 'failed',
          error:
            'SSE error: Non-200 status code (403)\nAuthentication failed for the synthetic metrics endpoint.\nVerify the workspace token and reconnect the server.',
        },
      }
    : {
        browser: { status: 'connected' },
        docs: { status: 'connected' },
        issue_tracker: { status: 'disabled' },
        metrics: { status: 'failed', error: 'Synthetic authentication error' },
        repository: { status: 'disabled' },
      }

function result(data) {
  return Promise.resolve({ data })
}

function openMcpError(dispatch) {
  if (SCENE !== 'mcp-error') return

  dispatch('opencode-navigator.focus.mcp')
  setTimeout(() => {
    for (let index = 0; index < 3; index++) dispatch('opencode-navigator.navigation.next')
    dispatch('opencode-navigator.navigation.right')
    dispatch('opencode-navigator.navigation.activate')
  }, 300)
}

function openSettingsImportPreview(dispatch) {
  if (SCENE !== 'settings-import-preview') return

  setTimeout(() => {
    dispatch('opencode-navigator.settings.next')
    dispatch('opencode-navigator.settings.next')
    dispatch('opencode-navigator.settings.select')
  }, 1100)
}

function focusPortableSettings(dispatch) {
  if (SCENE === 'settings-portability') setTimeout(() => dispatch('opencode-navigator.settings.next'), 650)
}

function fixtureReadyDelay() {
  if (SCENE === 'setup-sections') return 4800

  if (SCENE === 'settings-import-preview') return 3400

  if (['mcp-presets', 'mcp-preset-actions', 'mcp-preset-preview'].includes(SCENE)) return 3500

  if (SCENE === 'settings-mcp-groups') return 4200

  return 2800
}

function openSearchScene(api, dispatch, later) {
  if (!['search-skills', 'search-subagents', 'search-mcp', 'search-actions', 'skill-confirmation'].includes(SCENE))
    return

  api.keymap.dispatchCommand('opencode-navigator.search')
  const tab = { 'search-subagents': 1, 'search-mcp': 2, 'search-actions': 3 }[SCENE] ?? 0

  if (tab > 0) {
    setTimeout(() => {
      for (let index = 0; index < tab; index++) dispatch('opencode-navigator.search-dialog.next-tab')
    }, 300)
  }

  if (SCENE === 'skill-confirmation') later(500, 'opencode-navigator.search-dialog.select')

  if (SCENE.startsWith('search-')) setTimeout(() => api.renderer.currentFocusedRenderable?.blur(), 1000)
}

function service(target, methods) {
  return new Proxy(target, {
    get(value, property) {
      if (property in methods) return methods[property]

      const member = Reflect.get(value, property, value)

      return typeof member === 'function' ? member.bind(value) : member
    },
  })
}

const plugin = {
  id: 'opencode-navigator-screenshot-fixture',
  async tui(api, options, meta) {
    Date.now = () => FIXTURE_NOW
    api.kv.set('dismissed_getting_started', true)

    const fixtureSession = (sessionID) => ({
      id: sessionID,
      title: 'Navigator product tour',
      directory: DIRECTORY,
      workspaceID: WORKSPACE_ID,
      time: { created: FIXTURE_NOW - 900_000, updated: FIXTURE_NOW },
    })
    const sessionState = {
      ...api.state.session,
      count: () => 3,
      get: (sessionID) => childSessions.find((session) => session.id === sessionID) ?? fixtureSession(sessionID),
      todo: () => todos,
      status: (sessionID) => statuses[sessionID] ?? { type: 'busy' },
    }
    const state = new Proxy(api.state, {
      get(target, property) {
        if (property === 'ready') return true

        if (property === 'path') return { ...target.path, directory: DIRECTORY, worktree: WORKTREE }

        if (property === 'config') return { ...target.config, lsp: true }

        if (property === 'session') return sessionState

        if (property === 'lsp')
          return () => [
            { id: 'typescript', root: '', status: 'connected' },
            { id: 'eslint', root: '', status: 'connected' },
            { id: 'python', root: '', status: 'error' },
          ]

        if (property === 'mcp')
          return () => Object.entries(mcpStatuses).map(([name, status]) => ({ name, ...status }))

        return Reflect.get(target, property, target)
      },
    })
    const client = new Proxy(api.client, {
      get(target, property) {
        if (property === 'session')
          return service(target.session, {
            todo: () => result(todos),
            children: () => result(childSessions),
            status: () => result(statuses),
          })

        if (property === 'app') return service(target.app, { skills: () => result(skills) })

        if (property === 'mcp')
          return service(target.mcp, {
            status: () => result(mcpStatuses),
            connect: () => result(true),
            disconnect: () => result(true),
          })

        if (property === 'tui') return service(target.tui, { appendPrompt: () => result(true) })

        const member = Reflect.get(target, property, target)

        return typeof member === 'function' ? member.bind(target) : member
      },
    })
    const event = new Proxy(api.event, {
      get(target, property) {
        if (property !== 'on') return Reflect.get(target, property, target)

        return (eventType, callback) => {
          const unsubscribe = target.on(eventType, callback)

          if (eventType === 'installation.update-available')
            setTimeout(() => callback({ properties: { version: '999.0.0' } }), 100)

          if (SCENE === 'subagents-errors' && eventType === 'session.error')
            setTimeout(
              () =>
                callback({
                  properties: {
                    sessionID: 'session-worker-review',
                    error: { name: 'SyntheticError', data: { message: 'Synthetic review failure' } },
                  },
                }),
              900,
            )

          if (SCENE === 'subagents-errors' && eventType === 'session.idle')
            setTimeout(() => callback({ properties: { sessionID: 'session-worker-review' } }), 1000)

          return unsubscribe
        }
      },
    })

    const originalFetch = globalThis.fetch

    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: (input, init) =>
        String(input) === 'https://registry.npmjs.org/opencode-navigator/latest'
          ? Promise.resolve(Response.json({ version: '999.0.0' }))
          : originalFetch(input, init),
    })

    try {
      await navigator.tui(
        new Proxy(api, { get: (target, property) => ({ state, client, event })[property] ?? target[property] }),
        options,
        meta,
      )
    } finally {
      Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: originalFetch })
    }
    setTimeout(() => {
      const dispatch = (command) => api.keymap.dispatchCommand(command)
      const later = (delay, command) => setTimeout(() => dispatch(command), delay)
      const openSettings = () => {
        dispatch('opencode-navigator.focus')
        later(150, 'opencode-navigator.navigation.activate')
      }
      const openMcpPresets = () => {
        dispatch('opencode-navigator.focus.mcp')
        later(1000, 'opencode-navigator.navigation.right')
        later(1200, 'opencode-navigator.navigation.activate')
      }

      if (SCENE === 'todo-active' || SCENE === 'todo-finished') {
        dispatch('opencode-navigator.focus.todo')
        setTimeout(() => {
          dispatch('opencode-navigator.navigation.next')
          dispatch('opencode-navigator.navigation.right')

          if (SCENE === 'todo-finished') dispatch('opencode-navigator.navigation.right')

          dispatch('opencode-navigator.navigation.activate')
        }, 200)
      }

      if (SCENE === 'subagents-errors') {
        dispatch('opencode-navigator.focus.subagents')
        setTimeout(() => {
          dispatch('opencode-navigator.navigation.next')
          dispatch('opencode-navigator.navigation.next')
          for (let index = 0; index < 3; index++) dispatch('opencode-navigator.navigation.right')
          dispatch('opencode-navigator.navigation.activate')
        }, 700)
      }

      openSearchScene(api, dispatch, later)

      if (
        (SCENE.startsWith('settings-') && SCENE !== 'settings-control-hover') ||
        SCENE === 'quick-actions-settings' ||
        SCENE.startsWith('layout-preset')
      ) {
        openSettings()
        const tab = {
          'settings-scope': 1,
          'settings-presets': 2,
          'settings-behavior': 3,
          'settings-defaults': 4,
          'settings-portability': 4,
          'settings-import-preview': 4,
          'settings-trusted-skills': 4,
          'layout-preset-menu': 2,
          'layout-preset-preview': 2,
        }[SCENE]

        if (tab) {
          setTimeout(() => {
            for (let index = 0; index < tab; index++) dispatch('opencode-navigator.settings.next-tab')
          }, 400)
        }

        if (SCENE === 'quick-actions-settings') {
          setTimeout(() => {
            for (let index = 0; index < 3; index++) dispatch('opencode-navigator.settings.next')
            dispatch('opencode-navigator.settings.quick-actions')
          }, 400)
        }

        if (SCENE === 'settings-mcp-groups') {
          setTimeout(() => {
            for (let index = 0; index < 5; index++) dispatch('opencode-navigator.settings.next')
            dispatch('opencode-navigator.settings.mcp-groups')
          }, 400)
          later(1500, 'opencode-navigator.mcp-preset-menu.select')
        }

        if (SCENE === 'settings-trusted-skills') {
          setTimeout(() => {
            for (let index = 0; index < 6; index++) dispatch('opencode-navigator.settings.next')
            dispatch('opencode-navigator.settings.select')
          }, 650)
        }

        if (SCENE === 'layout-preset-menu' || SCENE === 'layout-preset-preview')
          later(600, 'opencode-navigator.settings.select')

        if (SCENE === 'layout-preset-preview') later(800, 'opencode-navigator.mcp-preset-menu.select')
      }

      if (SCENE === 'mcp-presets' || SCENE === 'mcp-preset-actions' || SCENE === 'mcp-preset-preview') {
        openMcpPresets()

        if (SCENE === 'mcp-preset-actions' || SCENE === 'mcp-preset-preview') {
          later(1600, 'opencode-navigator.mcp-preset-menu.next')
          later(1700, 'opencode-navigator.mcp-preset-menu.select')
        }

        if (SCENE === 'mcp-preset-preview') later(1900, 'opencode-navigator.mcp-preset-menu.select')
      }

      if (SCENE === 'keyboard-help') {
        dispatch('opencode-navigator.focus')
        later(200, 'opencode-navigator.navigation.help')
      }

      openMcpError(dispatch)
      openSettingsImportPreview(dispatch)
      focusPortableSettings(dispatch)

      if (SCENE === 'setup-sections') {
        for (let index = 0; index < 6; index++) later(400 + index * 500, 'opencode-navigator.wizard.select')
      }
    }, 1200)
    setTimeout(() => void Bun.write('/tmp/navigator-fixture.ready', 'ready\n'), fixtureReadyDelay())
  },
}

export default plugin
