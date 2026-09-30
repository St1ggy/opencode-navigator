import { expect, test } from 'bun:test'
import { createRoot } from 'solid-js'

import { createPreferencesController } from '../src/entities/preferences'
import { createSettingsGroups } from '../src/features/sidebar-settings/model/settings-groups'
import { pluginConfig } from '../src/shared/config'
import { setHostCapabilities } from '../src/shared/lib/host-capabilities'

import type { useIcons } from '../src/shared/ui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

test('OpenCode 1 has separate title and date switches while OpenCode 2 omits unsupported options', async () => {
  const icons = {
    icon: (name: string) => name,
    section: (name: string) => name,
    tab: (name: string) => name,
  } as ReturnType<typeof useIcons>
  const controller = (api: TuiPluginApi) =>
    createPreferencesController(api, pluginConfig(undefined), {
      async load() {
        return { global: {}, worktrees: {}, user: {} }
      },
      async update() {},
      async flush() {},
    })
  const v1 = {} as TuiPluginApi
  const v2 = {} as TuiPluginApi
  const preferences1 = controller(v1)
  const preferences2 = controller(v2)

  setHostCapabilities(v2, { todo: true, lsp: false, titleVisibility: false })
  await preferences1.load()
  await preferences2.load()
  const options = (api: TuiPluginApi, preferences: typeof preferences1) =>
    createRoot((dispose) => {
      const values = createSettingsGroups(api, preferences, icons)().find((group) => group.id === 'sections')!.options

      dispose()

      return values.map((value) => value.value)
    })

  expect(options(v1, preferences1).slice(0, 2)).toEqual(['session_title', 'session_date'])
  expect(options(v2, preferences2)).not.toContain('session_title')
  expect(options(v2, preferences2)).not.toContain('session_date')
})
