import { Command, SettingsPage } from '@opencode/plugin/gui'

import { GuiNavigatorSettings, GuiOnboardingDialog } from '../../features/sidebar-settings/gui'

import { guiRelease } from './release'
import { registerGuiStartup } from './startup'

import type { GuiSettingsServices } from '../../features/sidebar-settings/gui'
import type { Context } from '@opencode/plugin/gui'

export function registerGuiSettings(context: Context, services: GuiSettingsServices) {
  const id = `${context.id}.settings`
  const open = () => context.layout.settings(id)
  const showGuide = () => context.dialogs.open((dialog) => <GuiOnboardingDialog {...services} close={dialog.close} />)

  registerGuiStartup(context, services.preferences, showGuide, guiRelease)

  context.add(SettingsPage, {
    id,
    title: 'Navigator',
    icon: 'settings-gear',
    entries: [
      { id: 'navigator-overflow', title: 'Toolbar overflow', keywords: 'pins wrap More' },
      { id: 'navigator-quota-refresh', title: 'Limits refresh', keywords: 'quota interval minutes' },
    ],
    render: (input) => <GuiNavigatorSettings {...services} target={input.target} showGuide={showGuide} />,
  })
  context.add(Command, { id: 'settings', title: 'Navigator settings', run: open })

  return open
}
