import { navigatorUpdateAction } from '../../../entities/navigator-release/model'

import { getNavigatorAboutServices } from './about-services'

import type { useIcons } from '../../../shared/ui'
import type { SettingsOption } from './settings-groups'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function aboutSettingsOptions(api: TuiPluginApi, icons: ReturnType<typeof useIcons>): SettingsOption[] {
  const service = getNavigatorAboutServices(api)
  const state = service?.checkState()
  const action = navigatorUpdateAction({
    checking: service?.checking() ?? false,
    busy: !service || service.updating(),
    available: state?.status === 'available',
    latest: state?.latest,
    restart: service?.installed?.(),
    progress: service?.installation?.navigatorProgress(),
  })
  const icon = action.kind === 'update' ? 'update' : 'retry'

  return [
    {
      title: `${icons.icon(icon)} ${action.label}`,
      value: 'about:check',
      description: action.detail,
      disabled: action.kind === 'waiting' || action.kind === 'restart',
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
