/** @jsxImportSource @opentui/solid */
import { testRender } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { type JSX, Show, createSignal } from 'solid-js'

import { PLUGIN_ID } from '../src/constants'
import { createDialogStack } from '../src/dialogs/context'
import { SearchEverythingDialog, type SearchServices } from '../src/dialogs/search'
import { uiIcon } from '../src/icons/ui'

import type { Renderable, ScrollBoxRenderable } from '@opentui/core'

function find(node: Renderable, id: string): Renderable | undefined {
  if (node.id === id) return node

  for (const child of node.getChildren()) {
    const match = find(child, id)

    if (match) return match
  }

  return undefined
}

test('search stays above the screen midpoint and preserves scroll and rows during background polling', async () => {
  for (const height of [24, 60]) {
    const [items, setItems] = createSignal(
      Array.from({ length: 50 }, (_, index) => ({
        name: `skill-${String(index).padStart(2, '0')}`,
        location: `/skills/${index}`,
        content: '',
        description: 'A long skill description that should occupy just one preview line. '.repeat(8),
      })),
    )
    const [status, setStatus] = createSignal<'ready' | 'refreshing'>('ready')
    let commands: { name: string; run: () => void }[] = []
    let closes = 0
    const [modal, setModal] = createSignal<() => JSX.Element>()
    const requests: boolean[] = []
    const refresh = async (_target: unknown, force: boolean) => {
      requests.push(force)

      return []
    }
    const services = {
      api: {
        route: { current: { name: 'session', params: { sessionID: 'one' } } },
        state: { path: { directory: '/repo' }, session: { get: () => ({ directory: '/repo' }) } },
        theme: {
          current: {
            text: '#ffffff',
            textMuted: '#888888',
            accent: '#00ffff',
            error: '#ff0000',
            backgroundElement: '#222222',
            backgroundPanel: '#111111',
          },
        },
        keymap: {
          registerLayer: (layer: { commands: typeof commands }) => {
            commands = layer.commands

            return () => {}
          },
        },
        ui: {
          toast() {},
          dialog: {
            clear: () => {
              closes++
              setModal(undefined)
            },
            replace: (render: () => JSX.Element) => setModal(() => render),
            setSize() {},
          },
        },
      },
      preferences: {
        load: async () => {},
        favoriteSkills: () => new Set(),
        favoriteMcpServers: () => new Set(),
        recentSkills: () => [],
        quickActionOrder: () => [],
        shouldConfirmSkill: () => true,
      },
      skills: { target: () => ({ key: 'test' }), list: items, refresh, state: () => ({ status: status() }) },
      subagents: { list: () => [], recent: () => [], refresh, state: () => ({ status: status() }) },
      mcp: {
        target: () => ({ key: 'test' }),
        list: () => [],
        refresh,
        state: () => ({ status: 'ready' }),
        mutating: () => false,
        bulkState: () => ({ status: 'idle' }),
      },
    } as unknown as SearchServices
    const dialogs = createDialogStack(services.api)
    const setup = await testRender(
      () => (
        <box width="100%" height="100%" paddingTop={height / 4} alignItems="center" onMouseUp={() => closes++}>
          <box width={88} paddingTop={1} backgroundColor="#111111" onMouseUp={(event) => event.stopPropagation()}>
            <Show keyed when={modal()}>
              {(render) => render()}
            </Show>
          </box>
        </box>
      ),
      { width: 100, height },
    )
    const expectCorners = (row: Renderable) => {
      const lines = setup
        .captureCharFrame()
        .split('\n')
        .map((line) => [...line])

      for (const [dx, dy, icon] of [
        [0, 0, 'selectionTopLeft'],
        [row.width - 1, 0, 'selectionTopRight'],
        [0, row.height - 1, 'selectionBottomLeft'],
        [row.width - 1, row.height - 1, 'selectionBottomRight'],
      ] as const) {
        expect(lines[row.y + dy][row.x + dx], icon).toBe(uiIcon(icon))
      }
    }

    try {
      dialogs.open(() => <SearchEverythingDialog {...services} />, 'large')
      await setup.flush()
      let panel = find(setup.renderer.root, `${PLUGIN_ID}.search-dialog`)!
      let body = find(setup.renderer.root, `${PLUGIN_ID}.search-dialog.results`)! as ScrollBoxRenderable
      const rowID = `${PLUGIN_ID}.search-dialog.skill:/skills/20`
      const row = find(setup.renderer.root, rowID)!

      expect(panel.y).toBeLessThan(height / 4)
      expect(panel.height).toBeLessThanOrEqual(26)
      expect(panel.y + panel.height).toBeLessThan(height)
      expect(row.height).toBe(2)
      expectCorners(find(setup.renderer.root, `${PLUGIN_ID}.search-dialog.skill:/skills/0`)!)
      const nextRow = find(setup.renderer.root, `${PLUGIN_ID}.search-dialog.skill:/skills/21`)!

      expect(nextRow.y - row.y).toBe(3)
      expect(requests).toEqual([false, false, false])
      body.scrollTo(24)
      await setup.flush()
      const scrollTop = body.scrollTop
      const frame = setup.captureCharFrame()

      expect(scrollTop).toBeGreaterThan(0)
      for (let tick = 0; tick < 3; tick++) {
        setStatus('refreshing')
        setItems(items().map((item) => ({ ...item })))
        await setup.flush()
        expect(body.scrollTop).toBe(scrollTop)
        expect(find(setup.renderer.root, rowID)).toBe(row)
        expect(setup.captureCharFrame()).toBe(frame)
        expect(setup.captureCharFrame()).not.toContain('Refreshing')
        setStatus('ready')
        await setup.flush()
        expect(body.scrollTop).toBe(scrollTop)
      }
      commands.find((command) => command.name.endsWith('.next-tab'))!.run()
      await setup.flush()
      expect(setup.captureCharFrame()).toContain('No matching results')
      commands.find((command) => command.name.endsWith('.previous-tab'))!.run()
      await setup.flush()
      expect(body.scrollTop).toBe(scrollTop)
      commands.find((command) => command.name.endsWith('.select'))!.run()
      await setup.flush()
      expect(setup.captureCharFrame()).toContain('Cancel')
      dialogs.back()
      await setup.flush()
      panel = find(setup.renderer.root, `${PLUGIN_ID}.search-dialog`)!
      body = find(setup.renderer.root, `${PLUGIN_ID}.search-dialog.results`)! as ScrollBoxRenderable
      expect(body.scrollTop).toBe(scrollTop)
      expect(setup.captureCharFrame()).toBe(frame)
      commands.find((command) => command.name.endsWith('.next'))!.run()
      await setup.flush()
      expect(body.scrollTop).toBeLessThan(scrollTop)
      await setup.mockMouse.click(panel.x + 3, panel.y + 3)
      expect(closes).toBe(0)
      await setup.mockInput.typeText('skill-49')
      await setup.flush()
      expect(body.scrollTop).toBe(0)
      expect(setup.captureCharFrame()).toContain('skill-49')
      expectCorners(find(setup.renderer.root, `${PLUGIN_ID}.search-dialog.skill:/skills/49`)!)
    } finally {
      setup.renderer.destroy()
    }
  }
})
