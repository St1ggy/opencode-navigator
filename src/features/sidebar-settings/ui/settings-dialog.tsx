import { Suspense, lazy } from 'solid-js'

import { createDialogStack } from '../../../shared/ui'

import type { SettingsDialog as SettingsContent } from './settings-dialog-content'
import type { McpController } from '../../../entities/mcp'
import type { PreferencesController } from '../../../entities/preferences'
import type { SkillController } from '../../../entities/skill'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

const Content = lazy(async () => {
  const path = import.meta.url.includes('/dist/') ? './sidebar-settings.js' : './settings-dialog-content'
  const module = (await import(path)) as { SettingsDialog: typeof SettingsContent }

  return { default: module.SettingsDialog }
})

export function SettingsDialog(props: Parameters<typeof SettingsContent>[0]) {
  return (
    <box>
      <Suspense>
        <Content {...props} />
      </Suspense>
    </box>
  )
}

export function openSettings(
  api: TuiPluginApi,
  preferences: PreferencesController,
  activeValue?: string,
  mcp?: McpController,
  skills?: SkillController,
) {
  createDialogStack(api, preferences.lspIconStyle, () => true, preferences.cornerFont).open(
    () => <SettingsDialog api={api} preferences={preferences} mcp={mcp} skills={skills} activeValue={activeValue} />,
    'xlarge',
  )
}
