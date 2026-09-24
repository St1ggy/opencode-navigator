/** @jsxImportSource @opentui/solid */
import { testRender } from '@opentui/solid'
import { expect, test } from 'bun:test'

import { pluginConfig } from '../src/config'
import { createPreferencesController } from '../src/controllers/preferences'
import { QuickActionsDialog } from '../src/dialogs/quick-actions'
import { uiIcon } from '../src/icons/ui'
import { QuickActionsSection } from '../src/pages/session-sidebar'
import { QUICK_ACTIONS, QUICK_ACTION_IDS, quickActionDisabledReason, quickActionLabel } from '../src/quick-actions'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { Renderable } from '@opentui/core'

function find(node: Renderable, id: string): Renderable | undefined {
  if (node.id === id) return node

  for (const child of node.getChildren()) {
    const match = find(child, id)

    if (match) return match
  }

  return undefined
}

test('quick action options sanitize IDs, append missing actions and preserve explicit visibility', () => {
  const config = pluginConfig({
    quick_action_order: ['session.export', 'bad', 'session.export'],
    quick_action_visibility: { 'session.rename': false, 'session.export': 'yes', unknown: true },
  })

  expect(config.quickActionOrder).toEqual([
    'session.export',
    ...QUICK_ACTION_IDS.filter((id) => id !== 'session.export'),
  ])
  expect(config.quickActionVisibility).toEqual({ 'session.rename': false })
})

test('quick action availability distinguishes routes, unsupported commands, and disabled commands', () => {
  const commands = [
    { name: 'session.new', run() {} },
    { name: 'session.rename', enabled: false, run() {} },
    { name: 'permission.mode', title: 'Enable auto-approve permissions', run() {} },
  ]
  const route: { current: { name: string; params?: { sessionID: string } } } = { current: { name: 'home' } }
  const api = {
    route,
    keymap: { getCommands: () => commands },
  } as unknown as TuiPluginApi
  const action = (id: (typeof QUICK_ACTION_IDS)[number]) => QUICK_ACTIONS.find((candidate) => candidate.command === id)!

  expect(quickActionDisabledReason(api, action('session.rename'))).toBe('Requires an open session')
  expect(quickActionDisabledReason(api, action('session.new'))).toBeUndefined()
  expect(quickActionDisabledReason(api, action('permission.mode'))).toBeUndefined()
  route.current = { name: 'session', params: { sessionID: 'one' } }
  expect(quickActionDisabledReason(api, action('session.rename'))).toBe('Unavailable in the current session')
  expect(quickActionDisabledReason(api, action('session.export'))).toBe('Unavailable in this OpenCode version')
  expect(quickActionLabel(api, action('permission.mode'))).toBe('Enable auto-approve permissions')
})

test('Quick Actions settings change live visibility and ordering and keep selection on the moved action', async () => {
  let commands: { name: string; run: () => void }[] = []
  let back = 0
  let autoApprove = false
  const dispatched: string[] = []
  const keymapStateListeners = new Set<() => void>()
  const autoApproveTitle = () => `${autoApprove ? 'Disable' : 'Enable'} auto-approve permissions`
  const api = {
    theme: {
      current: {
        text: '#ffffff',
        textMuted: '#888888',
        accent: '#00ffff',
        backgroundElement: '#222222',
        backgroundPanel: '#111111',
      },
    },
    state: { path: { directory: '/repo' }, session: { get: () => ({ directory: '/repo' }) } },
    route: { current: { name: 'session', params: { sessionID: 'one' } } },
    keymap: {
      registerLayer: (layer: { commands: typeof commands }) => {
        commands = layer.commands

        return () => {}
      },
      getCommandBindings: () => new Map(),
      getCommands: () =>
        QUICK_ACTIONS.map((action) => ({
          name: action.command,
          title: action.command === 'permission.mode' ? autoApproveTitle() : action.label,
          run() {},
        })),
      on: (name: string, listener: () => void) => {
        if (name === 'state') keymapStateListeners.add(listener)

        return () => keymapStateListeners.delete(listener)
      },
      dispatchCommand: (id: string) => {
        dispatched.push(id)

        if (id === 'permission.mode') {
          autoApprove = !autoApprove
          for (const listener of keymapStateListeners) listener()
        }

        return { ok: true }
      },
    },
    keys: { formatBindings: () => '' },
    ui: { toast() {}, dialog: { clear: () => back++ } },
  } as unknown as TuiPluginApi
  const preferences = createPreferencesController(api, pluginConfig(undefined), {
    load: async () => ({ global: {}, worktrees: {}, user: {} }),
    update: async () => {},
    flush: async () => {},
  })

  await preferences.load()
  preferences.toggleSectionExpanded('quick_actions')
  const settings = await testRender(
    () => (
      <box height="100%" paddingTop={5}>
        <QuickActionsDialog api={api} preferences={preferences} />
      </box>
    ),
    { width: 60, height: 20 },
  )
  const run = (name: string) => commands.find((command) => command.name.endsWith(`.${name}`))?.run()

  try {
    await settings.flush()
    expect(find(settings.renderer.root, 'opencode-navigator.quick-actions-settings')?.y).toBeLessThan(5)
    run('toggle')
    expect(preferences.quickActionVisible('session.rename')).toBe(false)
    run('down')
    run('toggle')
    expect(preferences.quickActionVisible('session.rename')).toBe(true)
    expect(preferences.quickActionOrder().slice(0, 2)).toEqual(['session.timeline', 'session.rename'])
    run('back')
    expect(back).toBe(1)
  } finally {
    settings.renderer.destroy()
  }
  const sidebar = await testRender(() => <QuickActionsSection api={api} preferences={preferences} />, {
    width: 45,
    height: 40,
  })

  try {
    await sidebar.flush()
    const frame = sidebar.captureCharFrame()

    expect(frame.indexOf('Timeline')).toBeLessThan(frame.indexOf('Rename'))
    const lines = frame.split('\n')
    const row = lines.findIndex((line) => line.includes('Timeline'))
    const renameRow = lines.findIndex((line) => line.includes('Rename'))

    expect(renameRow - row, frame).toBe(1)
    preferences.toggleRowDensity()
    await sidebar.flush()
    const comfortable = sidebar.captureCharFrame().split('\n')

    expect(
      comfortable.findIndex((line) => line.includes('Rename')) -
        comfortable.findIndex((line) => line.includes('Timeline')),
      comfortable.join('\n'),
    ).toBe(2)

    await sidebar.mockMouse.click(lines[row].indexOf('Timeline'), row)
    expect(dispatched).toEqual(['session.timeline'])
    const autoApproveRow = comfortable.findIndex((line) => line.includes('Enable auto-approve permissions'))

    await sidebar.mockMouse.click(
      comfortable[autoApproveRow].indexOf('Enable auto-approve permissions'),
      autoApproveRow,
    )
    await sidebar.flush()
    expect(dispatched).toEqual(['session.timeline', 'permission.mode'])
    expect(sidebar.captureCharFrame()).toContain('Disable auto-approve permissions')
    expect(sidebar.captureCharFrame()).not.toContain('Enable auto-approve permissions')
    expect(preferences.recentQuickActions()).toEqual([])

    const favoriteFrame = sidebar.captureCharFrame().split('\n')
    const favoriteRow = favoriteFrame.findIndex((line) => line.includes('Rename'))
    const favoriteColumn = Bun.stringWidth(
      favoriteFrame[favoriteRow].slice(0, favoriteFrame[favoriteRow].indexOf(uiIcon('bookmarkEmpty'))),
    )

    await sidebar.mockMouse.click(favoriteColumn, favoriteRow)
    await sidebar.flush()
    expect(preferences.favoriteQuickActions().has('session.rename')).toBe(true)
    expect(dispatched).toEqual(['session.timeline', 'permission.mode'])
    const reordered = sidebar.captureCharFrame()

    expect(reordered.indexOf('Rename')).toBeLessThan(reordered.indexOf('Timeline'))
    const reorderedLines = reordered.split('\n')

    expect(
      reorderedLines.findIndex((line) => line.includes('Timeline')) -
        reorderedLines.findIndex((line) => line.includes('Rename')),
      reordered,
    ).toBe(3)
    preferences.toggleQuickAction('session.rename')
    await sidebar.flush()
    expect(sidebar.captureCharFrame()).not.toContain('Rename')
    expect(preferences.favoriteQuickActions().has('session.rename')).toBe(true)
    preferences.toggleQuickAction('session.rename')
    for (const id of QUICK_ACTION_IDS) preferences.toggleQuickAction(id)
    await sidebar.flush()
    expect(sidebar.captureCharFrame()).toContain('No quick actions selected')
  } finally {
    sidebar.renderer.destroy()
  }
})
