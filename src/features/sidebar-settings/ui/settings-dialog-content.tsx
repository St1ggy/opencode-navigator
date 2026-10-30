import { TextAttributes } from '@opentui/core'
import { For, Show } from 'solid-js'

import { PLUGIN_ID } from '../../../shared/config'
import { DialogSurface, Tab } from '../../../shared/ui'
import { createSettingsDialogController } from '../model/settings-dialog-controller'

import { AboutVersionStatus } from './about-version-status'
import { SettingsOptionRow } from './settings-option-row'

import type { McpController } from '../../../entities/mcp'
import type { PreferencesController } from '../../../entities/preferences'
import type { SkillController } from '../../../entities/skill'
import type { SettingsTab } from '../../../shared/ui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function SettingsDialog(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  mcp?: McpController
  skills?: SkillController
  activeValue?: string
}) {
  const model = createSettingsDialogController(props)

  return (
    <DialogSurface api={props.api}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={model.theme().text}>
          {model.icons.icon('settings')} Navigator settings
        </text>
        <text
          fg={model.theme().textMuted}
          onMouseDown={(event) => event.stopPropagation()}
          onMouseUp={(event) => {
            event.stopPropagation()
            model.dialogs.back()
          }}
        >
          {model.icons.key('esc')}
        </text>
      </box>
      <text fg={model.theme().textMuted}>
        {model.activeGroup() === 'about'
          ? 'Version, updates, release history, and support.'
          : 'Adjust sections and behavior. Changes apply immediately.'}
      </text>
      <box flexDirection="row" flexWrap="wrap" columnGap={1} rowGap={0}>
        <For each={model.orderedGroups().map((group) => group.id)}>
          {(id) => (
            <Tab
              api={props.api}
              selected={model.activeGroup() === id}
              paddingLeft={1}
              paddingRight={1}
              onMouseDown={() => {
                model.setActiveGroup(id)
                model.setActive(0)
              }}
            >
              {model.icons.tab(id as SettingsTab)} {model.orderedGroups().find((group) => group.id === id)?.tab}
            </Tab>
          )}
        </For>
      </box>
      <scrollbox
        id={`${PLUGIN_ID}.settings.body`}
        ref={model.setBody}
        height={model.contentHeight()}
        scrollX={false}
        verticalScrollbarOptions={{ visible: true }}
        horizontalScrollbarOptions={{ visible: false }}
      >
        <box gap={1}>
          <Show when={model.activeGroup() === 'about'}>
            <AboutVersionStatus api={props.api} />
          </Show>
          <For each={model.options().map((option) => option.value)}>
            {(value) => (
              <SettingsOptionRow
                preferences={props.preferences}
                controller={model}
                option={model.options().find((option) => option.value === value)!}
              />
            )}
          </For>
        </box>
      </scrollbox>
      <text fg={model.theme().textMuted}>{model.footerHint()}</text>
    </DialogSurface>
  )
}
