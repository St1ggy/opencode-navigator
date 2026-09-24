import { createEffect, createMemo, createSignal, onCleanup, untrack } from 'solid-js'

import {
  type SubagentController,
  type SubagentViewMode,
  buildSubagentView,
  countSubagentView,
  createSubagentClock,
  filterSubagentView,
} from '../../../entities/subagent'
import { createListVisibility } from '../../../shared/lib/list-visibility'

import type { PreferencesController } from '../../../entities/preferences'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function createSubagentSectionModel(props: {
  api: TuiPluginApi
  controller: SubagentController
  preferences: PreferencesController
  sessionID: string
}) {
  const list = createMemo(() => props.controller.list(props.sessionID))
  const recent = createMemo(() => props.controller.recent?.(props.sessionID) ?? [])
  const rows = createMemo(() => buildSubagentView(list(), recent()))
  const [query, setQuery] = createSignal('')
  const [mode, setMode] = createSignal<SubagentViewMode>('all')
  const counts = createMemo(() => countSubagentView(rows(), query()))
  const tabs = createMemo<SubagentViewMode[]>(() => [
    'all',
    'active',
    'recent',
    ...(counts().errors > 0 ? (['errors'] as const) : []),
  ])
  const filtered = createMemo(() => filterSubagentView(rows(), mode(), query()))
  const parentID = createMemo(() => props.api.state?.session?.get(props.sessionID)?.parentID)
  const targetKey = createMemo(() => props.controller.target?.(props.sessionID).key ?? props.sessionID)

  createEffect(() => {
    targetKey()
    setQuery('')
    setMode('all')
  })
  createEffect(() => {
    if (mode() !== 'all' && counts()[mode()] === 0) setMode('all')
  })
  const visibility = createListVisibility({
    items: filtered,
    limit: () => props.preferences.sectionItemLimit?.('subagents') ?? 0,
    resetKey: () => JSON.stringify([targetKey(), query(), mode()]),
  })
  const clockKey = createMemo(() =>
    props.preferences.expanded().subagents && visibility.visible().some((item) => item.status.type !== 'idle')
      ? targetKey()
      : undefined,
  )
  const now = createSubagentClock(clockKey)
  const byId = createMemo(() => new Map(visibility.visible().map((item) => [item.session.id, item])))
  const ids = createMemo(() => visibility.visible().map((item) => item.session.id))
  const state = createMemo(() => props.controller.state(props.sessionID))

  createEffect(() => {
    const sessionID = props.sessionID

    targetKey()
    const deactivate = untrack(() => props.controller.activate?.(sessionID) ?? (() => {}))

    onCleanup(deactivate)
    untrack(() => void props.controller.refresh(sessionID).catch(() => {}))
  })

  return {
    list,
    recent,
    rows,
    query,
    setQuery,
    mode,
    setMode,
    counts,
    tabs,
    filtered,
    parentID,
    visibility,
    now,
    byId,
    ids,
    state,
  }
}
