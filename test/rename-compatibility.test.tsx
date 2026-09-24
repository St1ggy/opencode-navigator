/** @jsxImportSource @opentui/solid */
import { createDefaultOpenTuiKeymap } from '@opentui/keymap/opentui'
import { testRender, useRenderer } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { onCleanup } from 'solid-js'

import { SearchBinding } from '../src/components/search-binding'
import { pluginConfig } from '../src/config'
import { LEGACY_PLUGIN_ID, PLUGIN_ID } from '../src/constants'
import { createPreferencesController } from '../src/controllers/preferences'
import {
  SidebarFocusBinding,
  SidebarToggleBinding,
  createSidebarInteraction,
  useSidebarItem,
} from '../src/pages/session-sidebar'
import { createPreferencesStore } from '../src/preferences-store'

import type { SearchServices } from '../src/dialogs/search'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { BoxRenderable } from '@opentui/core'

test('Navigator reads and updates the existing Pretty Sidebar preferences file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'navigator-compat-'))
  const legacy = join(directory, LEGACY_PLUGIN_ID)

  try {
    await mkdir(legacy)
    await writeFile(
      join(legacy, 'preferences.json'),
      JSON.stringify({
        global: {
          behavior: {
            focusKey: 'alt+f',
            searchKey: 'alt+y',
            sectionItemLimits: { skills: 3 },
            quickActionVisibility: { 'session.export': false },
          },
        },
        worktrees: { '/repo': { mcp: { wiki: 'disabled' } } },
        user: {
          onboardingCompleted: true,
          favoriteSkills: ['/skills/review'],
          favoriteMcpServers: ['wiki'],
          favoriteQuickActions: ['session.export'],
          recentSkills: ['/z', '/a'],
          mcpPresets: { Work: { wiki: 'enabled' } },
          layoutPresets: { Focus: { sections: { skills: false }, expanded: {} } },
        },
      }),
    )
    const preferences = createPreferencesController(
      { ui: { toast() {} } } as unknown as TuiPluginApi,
      pluginConfig(undefined),
      createPreferencesStore(directory),
    )

    await preferences.load()
    expect(PLUGIN_ID).toBe('opencode-navigator')
    expect(await preferences.claimFirstRun()).toBe(false)
    expect(preferences.focusKey()).toBe('alt+f')
    expect(preferences.searchKey()).toBe('alt+y')
    expect(preferences.sectionItemLimit('skills')).toBe(3)
    expect(preferences.quickActionVisible('session.export')).toBe(false)
    expect(preferences.favoriteSkills().has('/skills/review')).toBe(true)
    expect(preferences.favoriteMcpServers().has('wiki')).toBe(true)
    expect(preferences.favoriteQuickActions().has('session.export')).toBe(true)
    expect(preferences.recentSkills()).toEqual(['/z', '/a'])
    expect(preferences.mcpPresets().Work).toEqual({ wiki: 'enabled' })
    expect(preferences.layoutPresets().Focus.sections.skills).toBe(false)
    expect(preferences.desiredMcpState('/repo', 'wiki')).toBe('disabled')
    preferences.setSearchKey('alt+s')
    await preferences.flush()
    expect(JSON.parse(await readFile(join(legacy, 'preferences.json'), 'utf8')).global.behavior.searchKey).toBe('alt+s')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('legacy toggle, focus-section and search commands forward to Navigator', async () => {
  let api!: TuiPluginApi
  let interaction!: ReturnType<typeof createSidebarInteraction>
  let toggles = 0
  let searches = 0

  function Harness() {
    const renderer = useRenderer()
    const keymap = createDefaultOpenTuiKeymap(renderer)
    const register = keymap.registerLayer.bind(keymap)

    keymap.registerLayer = (layer) => {
      const copy = { ...layer }

      Reflect.deleteProperty(copy, 'mode')

      return register(copy)
    }
    keymap.registerLayer({
      commands: [
        {
          name: 'session.sidebar.toggle',
          run: () => {
            toggles++
          },
        },
      ],
    })
    api = {
      renderer,
      keymap,
      route: { current: { name: 'session', params: { sessionID: 'one' } } },
      state: { path: { directory: '/repo' }, session: { get: () => ({ directory: '/repo' }) } },
      ui: { dialog: { open: false, replace: () => searches++, setSize() {} } },
    } as unknown as TuiPluginApi
    interaction = createSidebarInteraction(api)
    onCleanup(() => interaction.dispose())
    const preferences = createPreferencesController(api, pluginConfig(undefined), {
      load: async () => ({ global: {}, worktrees: {}, user: {} }),
      update: async () => {},
      flush: async () => {},
    })
    const item = useSidebarItem(api, interaction, {
      id: `${PLUGIN_ID}.section.skills`,
      position: { section: 3, row: 0, column: 0 },
      activate() {},
    })
    const services = { api, preferences } as SearchServices

    return (
      <box ref={(node: BoxRenderable) => interaction.setContentRoot(node)} focusable>
        <SidebarFocusBinding api={api} preferences={preferences} interaction={interaction} />
        <SidebarToggleBinding api={api} preferences={preferences} />
        <SearchBinding {...services} interaction={interaction} />
        <box ref={item.ref}>
          <text>Skills</text>
        </box>
      </box>
    )
  }
  const setup = await testRender(() => <Harness />, { width: 30, height: 5 })

  try {
    await setup.flush()
    expect(api.keymap.dispatchCommand(`${LEGACY_PLUGIN_ID}.toggle`).ok).toBe(true)
    expect(toggles).toBe(1)
    expect(api.keymap.dispatchCommand(`${LEGACY_PLUGIN_ID}.focus.skills`).ok).toBe(true)
    await Bun.sleep(60)
    await setup.flush()
    expect(interaction.selectedId()).toBe(`${PLUGIN_ID}.section.skills`)
    expect(api.keymap.dispatchCommand(`${LEGACY_PLUGIN_ID}.search`).ok).toBe(true)
    await Bun.sleep(60)
    expect(searches).toBe(1)
  } finally {
    setup.renderer.destroy()
  }
})
