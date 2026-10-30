import { getNavigatorAboutServices } from './about-services'

import type { SettingsOption } from './settings-groups'
import type { useIcons } from '../../../shared/ui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function aboutSettingsOptions(api: TuiPluginApi, icons: ReturnType<typeof useIcons>): SettingsOption[] {
  const service = getNavigatorAboutServices(api)
  const state = service?.checkState()
  const busy = !service || service.checking() || service.updating()
  let updateDescription = 'No confirmed update available'

  if (service?.installed?.()) updateDescription = 'Installed; restart OpenCode'
  else if (service?.updating()) updateDescription = 'Installing…'
  else if (state?.status === 'available') updateDescription = `Install ${state.latest}`

  return [
    {
      title: `${icons.icon('retry')} Check for updates`,
      value: 'about:check',
      description: service?.checking() ? 'Checking…' : 'Check the published Navigator version',
      disabled: busy,
    },
    {
      title: `${icons.icon('update')} Update Navigator…`,
      value: 'about:update',
      description: updateDescription,
      disabled: busy || state?.status !== 'available' || Boolean(service?.installed?.()),
    },
    {
      title: `${icons.icon('history')} Changelog by version…`,
      value: 'about:changelog',
      description: 'Browse the bundled release history',
      disabled: !service,
    },
    {
      title: `${icons.icon('bug')} Report a bug…`,
      value: 'about:bug-report',
      description: 'Edit a Bug report; send with gh or open your browser',
      disabled: !service,
    },
  ]
}
