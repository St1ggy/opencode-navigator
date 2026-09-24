/** @jsxImportSource @opentui/solid */
import { testRender } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { type JSX, createSignal } from 'solid-js'

import { McpSection, SkillsSection, SubagentSection, TodoSection } from '../src/pages/session-sidebar'

import type { McpController } from '../src/controllers/mcp'
import type { PreferencesController } from '../src/controllers/preferences'
import type { SkillController } from '../src/controllers/skills'
import type { SubagentController } from '../src/controllers/subagents'
import type { TodoController } from '../src/controllers/todo'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

const LIST_SIZE = 500
const MAX_RENDER_MS = 10_000
const target = { key: 'performance', scope: '/performance', routing: { directory: '/performance' } }
const expanded = {
  todo: true,
  subagents: true,
  skills: true,
  quick_actions: true,
  lsp: true,
  mcp: true,
}
const theme = {
  accent: '#ff9e64',
  primary: '#7aa2f7',
  selectedListItemText: '#16161e',
  text: '#c0caf5',
  textMuted: '#a9b1d6',
  backgroundPanel: '#16161e',
  backgroundElement: '#292e42',
  success: '#9ece6a',
  error: '#f7768e',
  warning: '#e0af68',
  info: '#7dcfff',
}
const api = {
  theme: { current: theme },
  ui: { dialog: { replace: () => {} }, toast: () => {} },
} as unknown as TuiPluginApi
const [limit, setLimit] = createSignal(0)
const preferences = {
  sectionItemLimit: limit,
  expanded: () => expanded,
  toggleSectionExpanded: () => {},
  shouldConfirmSkill: () => false,
  skipSkillConfirmation: () => {},
} as unknown as PreferencesController

async function expectLargeList(component: () => JSX.Element, lastItem: string) {
  const started = performance.now()
  const setup = await testRender(component, { width: 60, height: LIST_SIZE * 2 + 10 })

  try {
    await setup.renderOnce()
    const frame = setup.captureCharFrame()

    expect(frame).toContain(lastItem)
    expect(performance.now() - started).toBeLessThan(MAX_RENDER_MS)
    setLimit(5)
    await setup.renderOnce()
    expect(setup.captureCharFrame()).not.toContain(lastItem)
    const itemPattern = new RegExp(String.raw`${lastItem.split('-', 1)[0]}-\d+`, 'g')

    expect([...setup.captureCharFrame().matchAll(itemPattern)]).toHaveLength(5)
    expect(setup.captureCharFrame()).toContain('Show all (495 more)')
    let lines = setup.captureCharFrame().split('\n')
    let row = lines.findIndex((line) => line.includes('Show all'))

    await setup.mockMouse.click(lines[row].indexOf('Show all'), row)
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain(lastItem)
    lines = setup.captureCharFrame().split('\n')
    row = lines.findIndex((line) => line.includes('Show less'))
    await setup.mockMouse.click(lines[row].indexOf('Show less'), row)
    await setup.renderOnce()
    expect(setup.captureCharFrame()).not.toContain(lastItem)
    expect(performance.now() - started).toBeLessThan(MAX_RENDER_MS)
  } finally {
    setup.renderer.destroy()
    setLimit(0)
  }
}

test('Todo renders a large list within the performance budget', async () => {
  const items = Array.from({ length: LIST_SIZE }, (_, index) => ({
    content: `todo-${index}`,
    status: 'pending' as const,
    priority: 'medium',
  }))
  const controller = {
    list: () => items,
    state: () => ({ status: 'ready' }),
    refresh: async () => items,
    retry: async () => items,
  } as unknown as TodoController

  await expectLargeList(
    () => <TodoSection api={api} controller={controller} preferences={preferences} sessionID="parent" />,
    `todo-${LIST_SIZE - 1}`,
  )
}, 15_000)

test('Subagents render a large list within the performance budget', async () => {
  const items = Array.from({ length: LIST_SIZE }, (_, index) => ({
    session: {
      id: `subagent-${index}`,
      title: `subagent-${index}`,
      parentID: 'parent',
      directory: '/performance',
      time: { created: index, updated: index },
    },
    status: { type: 'busy' as const },
  }))
  const controller = {
    list: () => items,
    state: () => ({ status: 'ready' }),
    refresh: async () => {},
    retry: async () => {},
    open: () => {},
  } as unknown as SubagentController

  await expectLargeList(
    () => <SubagentSection api={api} controller={controller} preferences={preferences} sessionID="parent" />,
    `subagent-${LIST_SIZE - 1}`,
  )
}, 15_000)

test('Skills render a large list within the performance budget', async () => {
  const items = Array.from({ length: LIST_SIZE }, (_, index) => ({
    name: `skill-${index}`,
    description: `Description ${index}`,
    location: `/skills/${index}`,
    content: '',
  }))
  const controller = {
    target: () => target,
    list: () => items,
    state: () => ({ status: 'ready' }),
    refresh: async () => items,
    retry: async () => items,
    use: async () => {},
  } as unknown as SkillController

  await expectLargeList(
    () => <SkillsSection api={api} controller={controller} preferences={preferences} />,
    `skill-${LIST_SIZE - 1}`,
  )
}, 15_000)

test('MCP renders a large list within the performance budget', async () => {
  const items = Array.from({ length: LIST_SIZE }, (_, index) => ({
    name: `mcp-${index}`,
    status: 'connected' as const,
  }))
  const controller = {
    target: () => target,
    list: () => items,
    state: () => ({ status: 'ready' }),
    retry: async () => items,
    serverState: () => ({ status: 'ready' }),
    retryServer: async () => {},
    mutating: () => false,
    toggle: async () => {},
  } as unknown as McpController

  await expectLargeList(
    () => <McpSection api={api} controller={controller} preferences={preferences} />,
    `mcp-${LIST_SIZE - 1}`,
  )
}, 15_000)
