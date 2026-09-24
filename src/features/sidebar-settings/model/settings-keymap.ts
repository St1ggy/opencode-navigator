import { SIDEBAR_SECTIONS, type SidebarSection } from '../../../entities/sidebar-layout'
import { PLUGIN_ID } from '../../../shared/config'

import type { SettingsOption } from './settings-groups'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { Accessor } from 'solid-js'

export function registerSettingsKeymap(input: {
  api: TuiPluginApi
  active: Accessor<number>
  activeGroup: Accessor<string>
  options: Accessor<SettingsOption[]>
  move: (offset: number) => void
  switchGroup: (offset: number) => void
  reorder: (value: string | undefined, direction: -1 | 1) => void
  select: () => void
  openQuickActions: () => void
  openMcpGroups: () => void
  openLimitPrompt: (section: SidebarSection) => void
}) {
  return input.api.keymap.registerLayer({
    mode: 'modal',
    priority: 1000,
    commands: [
      { name: `${PLUGIN_ID}.settings.previous`, run: () => input.move(-1) },
      { name: `${PLUGIN_ID}.settings.next`, run: () => input.move(1) },
      { name: `${PLUGIN_ID}.settings.select`, run: () => input.select() },
      {
        name: `${PLUGIN_ID}.settings.mcp-groups`,
        run: () => {
          if (input.activeGroup() === 'sections' && input.options()[input.active()]?.value === 'mcp')
            input.openMcpGroups()
        },
      },
      {
        name: `${PLUGIN_ID}.settings.quick-actions`,
        run: () => {
          if (input.activeGroup() === 'sections' && input.options()[input.active()]?.value === 'quick_actions')
            input.openQuickActions()
        },
      },
      {
        name: `${PLUGIN_ID}.settings.item-limit`,
        run: () => {
          const section = input.options()[input.active()]?.value as SidebarSection

          if (input.activeGroup() === 'sections' && SIDEBAR_SECTIONS.includes(section)) input.openLimitPrompt(section)
        },
      },
      { name: `${PLUGIN_ID}.settings.previous-tab`, run: () => input.switchGroup(-1) },
      { name: `${PLUGIN_ID}.settings.next-tab`, run: () => input.switchGroup(1) },
      { name: `${PLUGIN_ID}.settings.move-up`, run: () => input.reorder(input.options()[input.active()]?.value, -1) },
      { name: `${PLUGIN_ID}.settings.move-down`, run: () => input.reorder(input.options()[input.active()]?.value, 1) },
    ],
    bindings: [
      { key: 'up', cmd: `${PLUGIN_ID}.settings.previous` },
      { key: 'down', cmd: `${PLUGIN_ID}.settings.next` },
      { key: 'tab', cmd: `${PLUGIN_ID}.settings.next-tab` },
      { key: 'shift+tab', cmd: `${PLUGIN_ID}.settings.previous-tab` },
      { key: 'space', cmd: `${PLUGIN_ID}.settings.select` },
      { key: 'return', cmd: `${PLUGIN_ID}.settings.select` },
      { key: 'l', cmd: `${PLUGIN_ID}.settings.item-limit` },
      { key: 'a', cmd: `${PLUGIN_ID}.settings.quick-actions` },
      { key: 'g', cmd: `${PLUGIN_ID}.settings.mcp-groups` },
      { key: 'left', cmd: `${PLUGIN_ID}.settings.move-up` },
      { key: 'right', cmd: `${PLUGIN_ID}.settings.move-down` },
      { key: 'shift+up', cmd: `${PLUGIN_ID}.settings.move-up` },
      { key: 'shift+down', cmd: `${PLUGIN_ID}.settings.move-down` },
    ],
  })
}
