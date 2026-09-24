import { TextAttributes } from '@opentui/core'
import { For } from 'solid-js'

import { DialogSurface, Tab, createDialogStack } from '../../../shared/ui'
import { createSettingsDialogController } from '../model/settings-dialog-controller'

import { SettingsOptionRow } from './settings-option-row'

import type { McpController } from '../../../entities/mcp'
import type { PreferencesController } from '../../../entities/preferences'
import type { SettingsTab } from '../../../shared/ui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function SettingsDialog(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  mcp?: McpController
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
      <text fg={model.theme().textMuted}>Adjust sections and behavior. Changes apply immediately.</text>
      <box flexDirection="row" gap={1}>
        <For each={model.orderedGroups()}>
          {(group) => (
            <Tab
              api={props.api}
              selected={model.activeGroup() === group.id}
              paddingLeft={1}
              paddingRight={1}
              onMouseDown={() => {
                model.setActiveGroup(group.id)
                model.setActive(0)
              }}
            >
              {model.icons.tab(group.id as SettingsTab)} {group.tab}
            </Tab>
          )}
        </For>
      </box>
      <scrollbox
        ref={model.setBody}
        renderBefore={model.restoreScroll}
        renderAfter={model.saveScroll}
        height={model.contentHeight()}
        scrollX={false}
        verticalScrollbarOptions={{ visible: true }}
        horizontalScrollbarOptions={{ visible: false }}
      >
        <box gap={1}>
          <For each={model.options()}>
            {(option) => <SettingsOptionRow preferences={props.preferences} controller={model} option={option} />}
          </For>
        </box>
      </scrollbox>
      <text fg={model.theme().textMuted}>{model.footerHint()}</text>
    </DialogSurface>
  )
}

export function openSettings(
  api: TuiPluginApi,
  preferences: PreferencesController,
  activeValue?: string,
  mcp?: McpController,
) {
  createDialogStack(api, preferences.lspIconStyle, () => true, preferences.cornerFont).open(
    () => <SettingsDialog api={api} preferences={preferences} mcp={mcp} activeValue={activeValue} />,
    'xlarge',
  )
}
