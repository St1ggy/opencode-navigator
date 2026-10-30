/** @jsxImportSource @opentui/solid */
import { type BoxRenderable, type InputRenderable, RGBA } from '@opentui/core'
import { testRender, useRenderer } from '@opentui/solid'
import { createSignal, onMount } from 'solid-js'

import { QUICK_ACTIONS } from '../../src/entities/quick-action'
import { QuickActionsSection } from '../../src/pages/session-sidebar'
import { IconProvider } from '../../src/shared/ui'

import type { PreferencesController } from '../../src/entities/preferences'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export async function sidebarTypingHarness(mode: 'legacy-state' | 'native-reachable') {
  const [input, setInput] = createSignal('')
  const [automatic, setAutomatic] = createSignal(false)
  const listeners = new Set<() => void>()
  let prompt!: InputRenderable
  const theme = {
    text: '#ffffff',
    textMuted: '#888888',
    primary: '#00ffff',
    accent: '#ff9e64',
    selectedListItemText: '#000000',
    backgroundPanel: '#111111',
    backgroundElement: '#333333',
    borderSubtle: '#555555',
  }

  function Harness() {
    const api = {
      renderer: useRenderer(),
      theme: { current: theme },
      route: { current: { name: 'session', params: { sessionID: 'synthetic' } } },
      state: {
        path: { directory: '/synthetic', worktree: '/synthetic' },
        session: { get: () => ({ directory: '/synthetic' }) },
      },
      ui: { dialog: { open: false }, toast() {} },
      keys: { formatBindings: () => 'alt+r' },
      keymap: {
        registerLayer: () => () => {},
        dispatchCommand: () => ({ ok: true }),
        on(_name: string, listener: () => void) {
          listeners.add(listener)

          return () => listeners.delete(listener)
        },
        getCommands() {
          if (mode === 'native-reachable') input()

          const permission = `${automatic() ? 'Disable' : 'Enable'} auto-approve permissions`

          return QUICK_ACTIONS.map((action) => ({
            name: action.command,
            enabled: true,
            title: action.command === 'permission.mode' ? permission : action.label,
          }))
        },
        getCommandBindings: () => new Map(),
      },
    } as unknown as TuiPluginApi
    const preferences = {
      expanded: () => ({ quick_actions: true }),
      toggleSectionExpanded() {},
      sectionItemLimit: () => 0,
      rowDensity: () => 'compact',
      quickActionOrder: () => QUICK_ACTIONS.map((action) => action.command),
      quickActionVisible: () => true,
      favoriteQuickActions: () => new Set(),
      ready: () => true,
    } as unknown as PreferencesController

    onMount(() => prompt.focus())

    return (
      <IconProvider style={() => 'nerd'}>
        <box flexDirection="row">
          <box width={40}>
            <input
              ref={(node) => {
                prompt = node
              }}
              placeholder="Synthetic main prompt"
              onInput={(value) => {
                setInput(value)
                for (const listener of listeners) listener()
              }}
            />
          </box>
          <box width={40} backgroundColor={theme.backgroundPanel}>
            <QuickActionsSection api={api} preferences={preferences} />
          </box>
        </box>
      </IconProvider>
    )
  }
  const setup = await testRender(() => <Harness />, { width: 80, height: 28 })
  const row = () =>
    setup.renderer.root.findDescendantById('opencode-navigator.quick-action.session.rename') as BoxRenderable
  const frames: { node: BoxRenderable; text: string; background: string }[] = []

  await setup.flush()
  await setup.mockMouse.moveTo(row().screenX + 10, row().screenY)
  await setup.flush()
  setup.renderer.addPostProcessFn((buffer) => {
    const node = row()
    const offset = (node.screenY * buffer.width + node.screenX + 10) * 4
    const background = buffer.withBuffers((cells) => new RGBA(cells.bg.slice(offset, offset + 4)).toString())

    frames.push({ node, text: new TextDecoder().decode(buffer.getRealCharBytes(true)), background })
  })

  return { ...setup, row, frames, input, togglePermission: () => setAutomatic((value) => !value) }
}
