import { CatalogRow } from './catalog-row'
import { useNavigatorGui } from './context'

import type { QuickActionId } from '../../../../entities/quick-action/model'

export function GuiActionRow(props: { id: QuickActionId }) {
  const services = useNavigatorGui()
  const catalogs = () => services.runtime.catalogs!
  const state = () => catalogs().actionState(props.id)
  const Menu = services.ui.Menu
  const pinned = () =>
    catalogs()
      .preferences.toolbarPins()
      .some((pin) => pin.kind === 'action' && pin.id === props.id)

  return (
    <CatalogRow
      title={state().label}
      details={state().reason}
      disabled={!state().available}
      favorite={catalogs().preferences.favoriteQuickActions().has(props.id)}
      bookmarkDisabled={!catalogs().preferences.ready()}
      bookmark={() => catalogs().preferences.toggleFavoriteQuickAction(props.id)}
      activate={() =>
        void catalogs()
          .runAction(props.id)
          .catch((error: unknown) =>
            services.notifications.show({
              title: 'Quick Actions',
              variant: 'error',
              message: error instanceof Error ? error.message : 'The action could not be dispatched.',
            }),
          )
      }
      trailing={
        <Menu
          label={`Options for ${state().label}`}
          items={[
            {
              label: pinned() ? 'Configure toolbar button' : 'Pin to toolbar',
              icon: 'plus',
              disabled: !catalogs().preferences.ready(),
              onSelect: () => services.onPin({ kind: 'action', id: props.id, icon: 'bolt' }),
            },
          ]}
        />
      }
    />
  )
}
