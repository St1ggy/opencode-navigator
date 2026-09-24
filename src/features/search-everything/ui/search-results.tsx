import { For, Show } from 'solid-js'

import { SearchResultRow } from './search-result-row'

import type { SearchDialogController } from '../model/search-dialog-controller'

export function SearchResults(props: { model: SearchDialogController }) {
  const model = props.model

  return (
    <scrollbox
      id={`${model.prefix}.results`}
      ref={model.setBody}
      renderBefore={model.renderBefore}
      renderAfter={model.renderAfter}
      height={model.resultHeight()}
      contentOptions={{ minHeight: 0 }}
      scrollX={false}
    >
      <For each={model.errors()}>
        {({ group, state }) => (
          <text fg={model.theme().error} wrapMode="word">
            {model.icons.icon('error')} {group}: {state.error?.message} · {model.icons.key('ctrl+r')}{' '}
            {model.icons.icon('retry')} retry
          </text>
        )}
      </For>
      <Show
        when={model.results().length}
        fallback={
          <text fg={model.theme().textMuted}>
            {model.icons.icon(model.loading() ? 'pending' : 'search')}{' '}
            {model.loading() ? 'Loading sources…' : 'No matching results'}
          </text>
        }
      >
        <Show keyed when={model.queryScope()}>
          {(_scope) => (
            <For each={model.results().map((item) => item.id)}>{(id) => <SearchResultRow model={model} id={id} />}</For>
          )}
        </Show>
      </Show>
    </scrollbox>
  )
}
