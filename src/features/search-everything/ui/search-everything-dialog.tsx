import { DialogSurface, createDialogStack } from '../../../shared/ui'
import { searchContext } from '../model/search'
import { type SearchServices, createSearchDialogController } from '../model/search-dialog-controller'

import { SearchHeader } from './search-header'
import { SearchResults } from './search-results'

import type { Renderable } from '@opentui/core'

export function SearchEverythingDialog(props: SearchServices & { returnTarget?: Renderable | null }) {
  const model = createSearchDialogController(props)

  return (
    <DialogSurface api={props.api} id={model.prefix} lift>
      <SearchHeader api={props.api} model={model} />
      <SearchResults model={model} />
      <text fg={model.theme().textMuted} wrapMode="word">
        {model.icons.key('up/down')} select · {model.icons.key('tab/shift+tab')} switch · {model.icons.key('enter')}{' '}
        activate · {model.icons.key('esc')} close
      </text>
    </DialogSurface>
  )
}

export function openSearchEverything(
  services: SearchServices,
  returnTarget = services.api.renderer.currentFocusedRenderable,
) {
  const context = searchContext(services.api).key

  createDialogStack(
    services.api,
    services.preferences.lspIconStyle,
    () => searchContext(services.api).key === context,
    services.preferences.cornerFont,
  ).open(() => <SearchEverythingDialog {...services} returnTarget={returnTarget} />, 'large')
}

export type { SearchServices } from '../model/search-dialog-controller'
