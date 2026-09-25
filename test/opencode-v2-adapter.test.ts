import { expect, test } from 'bun:test'

import { createOpenCodeV2Api } from '../src/app/opencode-v2'
import { legacyTheme } from '../src/app/opencode-v2/theme-adapter'
import { hostCapabilityUnavailable, supportsSidebarSection } from '../src/shared/lib/host-capabilities'

import type { Plugin } from '@opencode/plugin/tui'

test('the OpenCode 2 theme adapter preserves V1 semantic color anchors', () => {
  const theme = {
    hue: {
      interactive: { 200: 'primary-200', 500: 'primary-500' },
      accent: { 200: 'accent-200', 400: 'accent-400', 500: 'accent-500' },
      neutral: { 500: 'neutral-500' },
    },
    categorical: [{ 200: 'secondary-200' }],
    text: {
      base: 'text',
      muted: 'muted',
      action: { primary: { focused: 'selected-text' } },
      feedback: {
        error: { base: 'error' },
        warning: { base: 'warning' },
        success: { base: 'success' },
        info: { base: 'info' },
      },
    },
    background: {
      base: 'background',
      raised: { base: 'panel', high: 'element', max: 'menu' },
    },
    border: { base: 'border' },
    scrollbar: { base: 'border-active' },
    diff: {
      text: { added: '', removed: '', context: '', hunkHeader: '' },
      highlight: { added: '', removed: '' },
      background: { added: '', removed: '', context: '' },
      lineNumber: { text: '', background: { added: '', removed: '' } },
    },
    markdown: {
      text: '',
      heading: '',
      link: '',
      linkText: '',
      code: '',
      blockQuote: '',
      emphasis: '',
      strong: '',
      horizontalRule: '',
      listItem: '',
      listEnumeration: '',
      image: '',
      imageText: '',
      codeBlock: '',
    },
    syntax: {
      comment: '',
      keyword: '',
      function: '',
      variable: '',
      string: '',
      number: '',
      type: '',
      operator: '',
      punctuation: '',
    },
  } as unknown as Plugin.Context['theme']

  const current = legacyTheme(theme)

  expect(current.primary).toBe('primary-200' as never)
  expect(current.secondary).toBe('secondary-200' as never)
  expect(current.accent).toBe('accent-200' as never)
  expect(current.selectedListItemText).toBe('selected-text' as never)
  expect(current.borderActive).toBe('border-active' as never)
  expect(current.borderSubtle).toBe('neutral-500' as never)
})

test('the OpenCode 2 adapter translates skills and MCP operations', async () => {
  const skillCalls: unknown[] = []
  const connectCalls: unknown[] = []
  const disconnectCalls: unknown[] = []
  const context = {
    options: {},
    location: { directory: '/workspace', workspaceID: 'workspace' },
    app: { version: '2.0.11', channel: 'stable' },
    renderer: { keyInput: { on() {}, off() {} } },
    client: {
      session: {
        skill: async (input: unknown) => {
          skillCalls.push(input)
        },
      },
      skill: {
        list: async (input: { location?: { directory?: string } }) => ({
          location: { directory: input.location?.directory ?? '/workspace' },
          data: [
            {
              id: input.location?.directory === '/other' ? 'skill-other' : 'skill-1',
              name: 'review',
              description: 'Review changes',
              path: '/workspace/.opencode/skills/review.md',
              content: '# Review',
            },
          ],
        }),
      },
      mcp: {
        list: async () => ({
          location: { directory: '/workspace' },
          data: [{ name: 'docs', status: { status: 'connected' } }],
        }),
        connect: async (input: unknown) => {
          connectCalls.push(input)
        },
        disconnect: async (input: unknown) => {
          disconnectCalls.push(input)
        },
      },
    },
    data: {
      location: {
        default: () => ({ directory: '/workspace' }),
        mcp: { server: { list: () => [{ name: 'docs', status: { status: 'connected' } }] } },
      },
      session: {
        list: () => [],
        get: (sessionID: string) =>
          sessionID === 'session-v2' ? { location: { directory: '/workspace' } } : undefined,
        status: () => 'idle',
      },
      listen: () => () => {},
    },
    keymap: {
      mode: { current: () => 'base', push: () => () => {} },
      commands: () => [],
      shortcuts: () => [],
      dispatch: () => {},
    },
    ui: {
      router: {
        current: () => ({ type: 'session', sessionID: 'session-v2' }),
        navigate: () => {},
      },
      dialog: { show: () => {}, set: () => {}, clear: () => {}, prompt: async () => {} },
      toast: { show: () => {} },
      slot: () => () => {},
    },
    theme: {},
    themeMode: 'dark',
    attention: {},
  } as unknown as Plugin.Context
  const adapter = createOpenCodeV2Api(context)
  const options = { throwOnError: true }

  const skills = await adapter.api.client.app.skills({ directory: '/workspace' }, options)

  expect(skills.data).toEqual([
    {
      name: 'review',
      description: 'Review changes',
      location: '/workspace/.opencode/skills/review.md',
      content: '# Review',
    },
  ])
  await adapter.api.client.app.skills({ directory: '/other' }, options)
  const activation = await adapter.api.client.tui.appendPrompt({ directory: '/workspace', text: '/review ' }, options)
  const staleActivation = await adapter.api.client.tui.appendPrompt({ directory: '/other', text: '/review ' }, options)

  expect(activation.data).toBe(true)
  expect(staleActivation.data).toBe(false)
  expect(skillCalls).toEqual([{ sessionID: 'session-v2', id: 'skill-1' }])

  const mcp = await adapter.api.client.mcp.status({ directory: '/workspace' }, options)

  expect(mcp.data).toEqual({ docs: { status: 'connected' } })
  await adapter.api.client.mcp.connect({ directory: '/workspace', name: 'docs' }, options)
  await adapter.api.client.mcp.disconnect({ directory: '/workspace', name: 'docs' }, options)
  expect(connectCalls).toEqual([{ server: 'docs', location: { directory: '/workspace' } }])
  expect(disconnectCalls).toEqual([{ server: 'docs', location: { directory: '/workspace' } }])
  expect(supportsSidebarSection(adapter.api, 'todo')).toBe(true)
  expect(hostCapabilityUnavailable(adapter.api, 'todo')).toContain('does not expose Todo data')
  expect(supportsSidebarSection(adapter.api, 'lsp')).toBe(false)
  expect(supportsSidebarSection(adapter.api, 'skills')).toBe(true)

  await adapter.dispose()
})

test('the OpenCode 2 event adapter translates updates and refreshes missing session data', async () => {
  const listeners: ((event: { details: unknown }) => void)[] = []
  const sessions = new Map<string, Record<string, unknown>>()
  const synced: string[] = []
  const context = {
    options: {},
    location: { directory: '/workspace', workspaceID: 'workspace' },
    app: { version: '2.0.16', channel: 'stable' },
    renderer: { keyInput: { on() {}, off() {} } },
    client: {},
    data: {
      location: { default: () => ({ directory: '/workspace' }) },
      session: {
        list: () => [],
        get: (sessionID: string) => sessions.get(sessionID),
        status: () => 'running',
        async sync(sessionID: string) {
          synced.push(sessionID)
          sessions.set(sessionID, {
            id: sessionID,
            projectID: 'project',
            cost: 0,
            tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
            time: { created: 1, updated: 2 },
            title: 'Synced session',
            location: { directory: '/workspace' },
          })
        },
      },
      listen: (listener: (event: { details: unknown }) => void) => {
        listeners.push(listener)

        return () => listeners.splice(listeners.indexOf(listener), 1)
      },
    },
    keymap: {
      mode: { current: () => 'base', push: () => () => {} },
      commands: () => [],
      shortcuts: () => [],
      dispatch: () => {},
    },
    ui: {
      router: { current: () => ({ type: 'home' }), navigate: () => {} },
      dialog: { show: () => {}, set: () => {}, clear: () => {}, prompt: async () => {} },
      toast: { show: () => {} },
      slot: () => () => {},
    },
    theme: {},
    themeMode: 'dark',
    attention: {},
  } as unknown as Plugin.Context
  const adapter = createOpenCodeV2Api(context)
  const updates: unknown[] = []
  const idle: unknown[] = []
  const created: unknown[] = []
  const unsubscribe = [
    adapter.api.event.on('installation.update-available', (event) => updates.push(event)),
    adapter.api.event.on('session.idle', (event) => idle.push(event)),
    adapter.api.event.on('session.created', (event) => created.push(event)),
  ]
  const emit = (details: unknown) => {
    for (const listener of listeners) listener({ details })
  }

  emit({ type: 'installation.update-available', data: { version: '2.0.17' } })
  emit({ type: 'session.idle', data: { sessionID: 'session-v2' } })
  emit({ type: 'session.created', data: { sessionID: 'session-v2' } })
  await Promise.resolve()

  expect(updates).toEqual([{ type: 'installation.update-available', properties: { version: '2.0.17' } }])
  expect(idle).toEqual([{ type: 'session.idle', properties: { sessionID: 'session-v2' } }])
  expect(adapter.api.state.session.status('session-v2')).toEqual({ type: 'idle' })
  expect(synced).toEqual(['session-v2'])
  expect(created).toEqual([
    expect.objectContaining({
      type: 'session.created',
      properties: { info: expect.objectContaining({ id: 'session-v2', title: 'Synced session' }) },
    }),
  ])

  for (const dispose of unsubscribe) dispose()
  expect(listeners).toHaveLength(0)
  await adapter.dispose()
})

test('the OpenCode 2 keymap adapter exposes reachable host commands for discovery', async () => {
  const dispatched: string[] = []
  const context = {
    options: {},
    location: { directory: '/workspace', workspaceID: 'workspace' },
    app: { version: '2.0.11', channel: 'stable' },
    renderer: { keyInput: { on() {}, off() {} } },
    client: {},
    data: {
      location: { default: () => ({ directory: '/workspace' }) },
      session: { list: () => [], get: () => {}, status: () => 'idle' },
      listen: () => () => {},
    },
    keymap: {
      mode: { current: () => 'base', push: () => () => {} },
      commands: () => [{ id: 'session.new', title: 'New session', enabled: true, run() {} }],
      shortcuts: () => [],
      dispatch: (id: string) => dispatched.push(id),
    },
    ui: {
      router: { current: () => ({ type: 'home' }), navigate: () => {} },
      dialog: { show: () => {}, set: () => {}, clear: () => {}, prompt: async () => {} },
      toast: { show: () => {} },
      slot: () => () => {},
    },
    theme: {},
    themeMode: 'dark',
    attention: {},
  } as unknown as Plugin.Context
  const adapter = createOpenCodeV2Api(context)

  expect(adapter.api.keymap.getCommands({ visibility: 'registered' }).map((command) => command.name)).toEqual([
    'session.new',
  ])
  expect(adapter.api.keymap.dispatchCommand('session.new').ok).toBe(true)
  expect(dispatched).toEqual(['session.new'])
  await adapter.dispose()
})
