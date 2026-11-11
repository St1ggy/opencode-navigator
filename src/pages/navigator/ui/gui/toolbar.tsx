import { GuiPinnedToolbar } from '../../../../features/pinned-toolbar/gui'

import { useNavigatorGui } from './context'

export function NavigatorPinnedToolbar() {
  const services = useNavigatorGui()

  return (
    <GuiPinnedToolbar
      ui={services.ui}
      model={services.toolbar}
      overflow={services.runtime.catalogs?.preferences.toolbarOverflow() ?? 'menu'}
      configure={services.onConfigurePin}
      manage={services.onManageToolbar}
    />
  )
}
