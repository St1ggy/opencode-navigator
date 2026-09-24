/** @jsxImportSource @opentui/solid */
import { testRender } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { createSignal } from 'solid-js'

import { McpGroupAssignmentDialog } from '../src/features/sidebar-settings/ui/mcp-group-assignment-dialog'
import { IconProvider } from '../src/icons/context'

import type { PreferencesController } from '../src/controllers/preferences'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

function setup() {
  const commands = new Map<string, () => void>()
  const [groups, setGroups] = createSignal({ alpha: 'Research', beta: 'Operations' })
  let cleared = 0
  let replaced = 0
  const api = {
    theme: { current: { text: '#ffffff', textMuted: '#888888', backgroundElement: '#222222' } },
    keymap: {
      registerLayer: (layer: { commands?: { name: string; run: () => void }[] }) => {
        const layerCommands = layer.commands ?? []

        for (const command of layerCommands) commands.set(command.name, command.run)

        return () => {}
      },
    },
    ui: {
      dialog: {
        clear: () => cleared++,
        replace: () => replaced++,
        setSize() {},
      },
    },
  } as unknown as TuiPluginApi
  const preferences = {
    mcpServerGroups: groups,
    setMcpServerGroup(name: string, group?: string) {
      const next = { ...groups() }

      if (group) next[name as keyof typeof next] = group
      else delete next[name as keyof typeof next]

      setGroups(next)
    },
  } as unknown as PreferencesController

  return { api, commands, groups, preferences, cleared: () => cleared, replaced: () => replaced }
}

test('MCP group assignment selects an existing group without opening an input', async () => {
  const model = setup()
  const view = await testRender(
    () => (
      <IconProvider style={() => 'nerd'}>
        <McpGroupAssignmentDialog api={model.api} preferences={model.preferences} server="alpha" />
      </IconProvider>
    ),
    { width: 44, height: 16 },
  )

  try {
    await view.flush()
    const frame = view.captureCharFrame()

    expect(frame).toContain('Operations')
    expect(frame).toContain('Research')
    expect(frame).toContain('Current')
    expect(frame).toContain('Create new group')
    model.commands.get('opencode-navigator.mcp-preset-menu.select')?.()
    expect(model.groups().alpha).toBe('Operations')
    expect(model.cleared()).toBe(1)
    expect(model.replaced()).toBe(0)
  } finally {
    view.renderer.destroy()
  }
})

test('MCP group assignment retains the new-group input path', async () => {
  const model = setup()
  const view = await testRender(
    () => (
      <IconProvider style={() => 'nerd'}>
        <McpGroupAssignmentDialog api={model.api} preferences={model.preferences} server="alpha" />
      </IconProvider>
    ),
    { width: 44, height: 16 },
  )

  try {
    await view.flush()
    model.commands.get('opencode-navigator.mcp-preset-menu.next')?.()
    model.commands.get('opencode-navigator.mcp-preset-menu.next')?.()
    await view.flush()
    model.commands.get('opencode-navigator.mcp-preset-menu.select')?.()
    expect(model.replaced()).toBe(1)
    expect(model.groups().alpha).toBe('Research')
  } finally {
    view.renderer.destroy()
  }
})
