import { ChangelogVersionsDialog } from '../ui/changelog-versions-dialog'

import { getNavigatorAboutServices } from './about-services'

import type { DialogNavigation } from '../../../shared/ui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function selectAboutAction(
  api: TuiPluginApi,
  dialogs: DialogNavigation,
  value: string,
  openBugReport: () => void,
) {
  const service = getNavigatorAboutServices(api)

  if (!service) return

  switch (value) {
    case 'about:check': {
      if (!service.checking() && !service.updating()) void service.check()

      break
    }

    case 'about:update': {
      if (service.checkState().status === 'available' && !service.updating()) service.update(dialogs)

      break
    }

    case 'about:changelog': {
      dialogs.open(() => <ChangelogVersionsDialog api={api} service={service} />)
      break
    }

    case 'about:bug-report': {
      openBugReport()
      break
    }
  }
}
