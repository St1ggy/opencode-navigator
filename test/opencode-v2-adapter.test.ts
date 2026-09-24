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
    renderer: {},
    client: {
      session: {
        skill: async (input: unknown) => {
          skillCalls.push(input)
        },
      },
      skill: {
        list: async () => ({
          location: { directory: '/workspace' },
          data: [
            {
              id: 'skill-1',
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
      session: { list: () => [], get: () => {}, status: () => 'idle' },
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
  const activation = await adapter.api.client.tui.appendPrompt({ directory: '/workspace', text: '/review ' }, options)

  expect(activation.data).toBe(true)
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

test('the OpenCode 2 keymap adapter exposes reachable host commands for discovery', async () => {
  const dispatched: string[] = []
  const context = {
    options: {},
    location: { directory: '/workspace', workspaceID: 'workspace' },
    app: { version: '2.0.11', channel: 'stable' },
    renderer: {},
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
