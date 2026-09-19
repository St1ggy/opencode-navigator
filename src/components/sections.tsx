import { type BoxRenderable, TextAttributes } from '@opentui/core'
import { For, type JSX, Show, createEffect, createMemo, createSignal, onCleanup, untrack } from 'solid-js'

import { PLUGIN_ID, QUICK_ACTIONS } from '../constants'
import { createListVisibility } from '../controllers/list-visibility'
import { type McpController, matchingMcpPreset } from '../controllers/mcp'
import { type TargetRequestState, isAbortError } from '../controllers/request-state'
import { useDialogs } from '../dialogs/context'
import { LspDetailsDialog } from '../dialogs/lsp'
import { openMcpPresets } from '../dialogs/mcp-presets'
import { SkillDialog } from '../dialogs/skill'
import { useIcons } from '../icons/context'
import { type LspIconStyle, lspIcon, lspIconName } from '../icons/lsp'
import { currentLocation } from '../location'
import { type SidebarInteraction, type SidebarOrder, offsetSidebarOrder } from '../sidebar-interaction'
import { mcpToggleAction } from '../state'
import {
  type SubagentViewItem,
  type SubagentViewMode,
  buildSubagentView,
  createSubagentClock,
  filterSubagentView,
  formatSubagentDuration,
} from '../subagent-view'
import { type TodoViewMode, buildTodoView } from '../todo-view'

import { Section, SectionFilter, SectionWithHeaderAction, matchesFilter, useSidebarItem } from './common'
import { ListVisibilityControl } from './list-visibility'

import type { PreferencesController } from '../controllers/preferences'
import type { SkillController, SkillInfo } from '../controllers/skills'
import type { SubagentController } from '../controllers/subagents'
import type { SidebarTodo, TodoController } from '../controllers/todo'
import type { TuiPluginApi, TuiSidebarLspItem, TuiSidebarMcpItem } from '@opencode-ai/plugin/tui'

function RequestErrorRow(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  id: string
  order: SidebarOrder
  state: TargetRequestState
  onRetry: () => void
}) {
  const icons = useIcons()
  const item = useSidebarItem(props.api, props.interaction, {
    id: props.id,
    order: () => props.order,
    disabled: () =>
      !props.state.error?.retryable || props.state.status === 'loading' || props.state.status === 'refreshing',
    activate: props.onRetry,
  })

  return (
    <Show when={props.state.error}>
      {(error) => (
        <box
          ref={(node: BoxRenderable) => item.ref(node)}
          id={props.id}
          flexDirection="row"
          gap={1}
          paddingLeft={1}
          paddingRight={1}
          backgroundColor={item.backgroundColor()}
          onMouseOver={item.onMouseOver}
          onMouseOut={item.onMouseOut}
          onMouseDown={(event) => {
            event.stopPropagation()
            item.activate(event)
          }}
        >
          <text
            flexGrow={1}
            fg={item.focused() ? item.foregroundColor() : props.api.theme.current.error}
            wrapMode="word"
          >
            {icons.icon('error')} {error().message}
          </text>
          <Show when={error().retryable}>
            <text flexShrink={0} fg={item.focused() ? item.foregroundColor() : props.api.theme.current.accent}>
              {icons.icon('retry')} Retry
            </text>
          </Show>
        </box>
      )}
    </Show>
  )
}

function SectionRequestBody(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  id: string
  order: SidebarOrder
  state: TargetRequestState
  hasItems: boolean
  empty: string
  loading: string
  onRetry: () => void
  children: JSX.Element
}) {
  const icons = useIcons()
  const pending = () => props.state.status === 'loading' || props.state.status === 'refreshing'

  return (
    <box>
      <RequestErrorRow
        api={props.api}
        interaction={props.interaction}
        id={props.id}
        order={props.order}
        state={props.state}
        onRetry={props.onRetry}
      />
      <Show when={pending() && !props.hasItems}>
        <text fg={props.api.theme.current.textMuted}>
          {icons.icon('pending')} {props.loading}
        </text>
      </Show>
      <Show when={props.state.status === 'refreshing' && props.hasItems}>
        <text fg={props.api.theme.current.textMuted}>{icons.icon('retry')} Refreshing…</text>
      </Show>
      <Show when={props.hasItems}>{props.children}</Show>
      <Show when={props.state.status === 'ready' && !props.hasItems && !props.state.error}>
        <text fg={props.api.theme.current.textMuted}>
          {icons.icon('info')} {props.empty}
        </text>
      </Show>
    </box>
  )
}

function TodoRow(props: { api: TuiPluginApi; item: SidebarTodo }) {
  const icons = useIcons()
  const theme = () => props.api.theme.current
  const done = () => props.item.status === 'completed'
  const active = () => props.item.status === 'in_progress'
  const cancelled = () => props.item.status === 'cancelled'
  const priorityLabel = () => {
    if (props.item.priority === 'high') return icons.icon('up')

    if (props.item.priority === 'medium') return icons.icon('priorityMedium')

    if (props.item.priority === 'low') return icons.icon('down')

    return icons.icon('help')
  }
  const priorityColor = () => {
    if (props.item.priority === 'high') return theme().error

    if (props.item.priority === 'medium') return theme().warning

    return theme().info
  }

  return (
    <box flexDirection="row" gap={1}>
      <text
        flexShrink={0}
        fg={active() ? theme().warning : done() ? theme().success : cancelled() ? theme().error : theme().textMuted}
      >
        {icons.icon(done() ? 'done' : active() ? 'busy' : cancelled() ? 'close' : 'idle')}
      </text>
      <text
        flexGrow={1}
        fg={active() ? theme().primary : theme().textMuted}
        attributes={done() ? TextAttributes.STRIKETHROUGH : active() ? TextAttributes.BOLD : undefined}
        wrapMode="word"
      >
        {props.item.content}
      </text>
      <Show when={props.item.priority === 'high' || props.item.priority === 'medium' || props.item.priority === 'low'}>
        <text flexShrink={0} fg={priorityColor()}>
          <b>{priorityLabel()}</b>
        </text>
      </Show>
    </box>
  )
}

export function TodoSection(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  controller: TodoController
  preferences: PreferencesController
  sessionID: string
  order?: number
}) {
  const icons = useIcons()
  const list = createMemo(() => props.controller.list(props.sessionID))
  const [mode, setMode] = createSignal<TodoViewMode>('all')
  const targetKey = createMemo(() => props.controller.target?.(props.sessionID).key ?? props.sessionID)

  createEffect(() => {
    targetKey()
    setMode('all')
  })
  const view = createMemo(() => buildTodoView(list(), mode()))
  const visibility = createListVisibility({
    items: () => view().rows,
    limit: () => props.preferences.sectionItemLimit?.('todo') ?? 0,
    resetKey: () => JSON.stringify([targetKey(), mode()]),
  })
  const state = createMemo(() => props.controller.state(props.sessionID))

  createEffect(() => {
    const sessionID = props.sessionID

    targetKey()
    const deactivate = untrack(() => props.controller.activate?.(sessionID) ?? (() => {}))

    onCleanup(deactivate)
    untrack(() => void props.controller.refresh(sessionID).catch(() => {}))
  })

  return (
    <Section
      api={props.api}
      interaction={props.interaction}
      sectionId={`${PLUGIN_ID}.section.todo`}
      order={props.order ?? 100}
      title="TODO"
      section="todo"
      summary={`${view().counts.completed}/${list().length}`}
      open={props.preferences.expanded().todo}
      onToggle={() => props.preferences.toggleSectionExpanded('todo')}
    >
      <SectionRequestBody
        api={props.api}
        interaction={props.interaction}
        id={`${PLUGIN_ID}.retry.todo`}
        order={[props.order ?? 100, 1]}
        state={state()}
        hasItems={list().length > 0}
        empty="No tasks yet"
        loading="Loading tasks…"
        onRetry={() => void props.controller.retry(props.sessionID)}
      >
        <box gap={1}>
          <box flexDirection="row" flexWrap="wrap">
            <For each={['all', 'active', 'finished'] as const}>
              {(value, index) => (
                <McpBulkAction
                  api={props.api}
                  interaction={props.interaction}
                  id={`${PLUGIN_ID}.todo.filter.${value}`}
                  order={[props.order ?? 100, 2 + index()]}
                  label={`${mode() === value ? `${icons.icon('radioOn')} ` : ''}${value[0].toUpperCase() + value.slice(1)} ${view().counts[value]}`}
                  disabled={false}
                  onActivate={() => setMode(value)}
                />
              )}
            </For>
          </box>
          <Show
            when={view().rows.length > 0}
            fallback={
              <text fg={props.api.theme.current.textMuted}>
                {mode() === 'active' ? 'No active tasks' : 'No finished tasks'}
              </text>
            }
          >
            <For each={visibility.visible()}>
              {(row, index) => (
                <box gap={1}>
                  <Show when={index() === 0 || visibility.visible()[index() - 1].group !== row.group}>
                    <text fg={props.api.theme.current.textMuted}>
                      <b>{row.group}</b>
                    </text>
                  </Show>
                  <TodoRow api={props.api} item={row.item} />
                </box>
              )}
            </For>
          </Show>
          <ListVisibilityControl
            api={props.api}
            interaction={props.interaction}
            section="todo"
            order={props.order ?? 100}
            visibility={visibility}
          />
        </box>
      </SectionRequestBody>
    </Section>
  )
}

function SubagentRow(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  item: SubagentViewItem
  now: number
  order: SidebarOrder
  onOpen: () => void
}) {
  const icons = useIcons()
  const theme = () => props.api.theme.current
  const retrying = () => props.item.status.type === 'retry'
  const idle = () => props.item.status.type === 'idle'
  const failed = () => props.item.run?.outcome === 'error'
  const cancelled = () => props.item.run?.outcome === 'cancelled'
  const id = () => `${PLUGIN_ID}.subagent.${props.item.session.id}`
  const row = useSidebarItem(props.api, props.interaction, {
    id: id(),
    order: () => props.order,
    activate: props.onOpen,
  })

  return (
    <box
      ref={(node: BoxRenderable) => row.ref(node)}
      id={id()}
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={row.backgroundColor()}
      onMouseOver={row.onMouseOver}
      onMouseOut={row.onMouseOut}
      onMouseDown={(event) => row.activate(event)}
    >
      <box flexDirection="row" gap={1}>
        <text
          flexShrink={0}
          fg={
            row.focused()
              ? row.foregroundColor()
              : failed()
                ? theme().error
                : retrying() || props.item.unavailable
                  ? theme().warning
                  : idle()
                    ? theme().textMuted
                    : theme().primary
          }
        >
          {icons.icon(failed() ? 'error' : cancelled() ? 'close' : retrying() ? 'retry' : idle() ? 'idle' : 'busy')}
        </text>
        <text flexGrow={1} fg={row.foregroundColor()} wrapMode="word">
          {props.item.session.title}
        </text>
        <text flexShrink={0} fg={row.focused() ? row.foregroundColor() : theme().textMuted}>
          {props.item.run
            ? formatSubagentDuration(
                props.item.run.startedAt,
                props.item.run.finishedAt ?? props.now,
                props.item.run.startedBeforeObservation,
              )
            : ''}
        </text>
      </box>
      <Show when={props.item.run?.errorMessage}>
        <text fg={row.focused() ? row.foregroundColor() : failed() ? theme().error : theme().textMuted} wrapMode="word">
          {cancelled() ? 'Cancelled' : 'Error'}: {props.item.run?.errorMessage}
        </text>
      </Show>
      <Show when={props.item.unavailable}>
        <text fg={theme().warning}>Worker status unavailable</text>
      </Show>
      <Show when={props.item.status.type === 'retry' ? props.item.status : undefined}>
        {(status) => (
          <text fg={row.focused() ? row.foregroundColor() : theme().warning} wrapMode="word">
            Retry #{status().attempt} · {Math.max(0, Math.ceil((status().next - props.now) / 1000))}s ·{' '}
            {status().message}
          </text>
        )}
      </Show>
      <Show when={idle() && !props.item.run?.errorMessage}>
        <text fg={theme().textMuted}>Finished</text>
      </Show>
    </box>
  )
}

export function SubagentSection(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  controller: SubagentController
  preferences: PreferencesController
  sessionID: string
  order?: number
}) {
  const icons = useIcons()
  const list = createMemo(() => props.controller.list(props.sessionID))
  const recent = createMemo(() => props.controller.recent?.(props.sessionID) ?? [])
  const rows = createMemo(() => buildSubagentView(list(), recent()))
  const [query, setQuery] = createSignal('')
  const [mode, setMode] = createSignal<SubagentViewMode>('all')
  const filtered = createMemo(() => filterSubagentView(rows(), mode(), query()))
  const parentID = createMemo(() => props.api.state?.session?.get(props.sessionID)?.parentID)
  const targetKey = createMemo(() => props.controller.target?.(props.sessionID).key ?? props.sessionID)

  createEffect(() => {
    targetKey()
    setQuery('')
    setMode('all')
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

  return (
    <Section
      api={props.api}
      interaction={props.interaction}
      sectionId={`${PLUGIN_ID}.section.subagents`}
      order={props.order ?? 200}
      title="SUBAGENTS"
      section="subagents"
      summary={`${list().length} active · ${recent().length} recent`}
      open={props.preferences.expanded().subagents}
      onToggle={() => props.preferences.toggleSectionExpanded('subagents')}
    >
      <Show when={parentID()}>
        {(id) => (
          <McpBulkAction
            api={props.api}
            interaction={props.interaction}
            id={`${PLUGIN_ID}.subagents.parent`}
            order={[props.order ?? 200, 0.5]}
            label={`${icons.icon('up')} Parent session`}
            disabled={false}
            onActivate={() => props.controller.open(id())}
          />
        )}
      </Show>
      <SectionRequestBody
        api={props.api}
        interaction={props.interaction}
        id={`${PLUGIN_ID}.retry.subagents`}
        order={[props.order ?? 200, 1]}
        state={state()}
        hasItems={rows().length > 0}
        empty="No subagents"
        loading="Loading subagents…"
        onRetry={() => void props.controller.retry(props.sessionID)}
      >
        <box gap={1}>
          <SectionFilter
            api={props.api}
            interaction={props.interaction}
            id={`${PLUGIN_ID}.filter.subagents`}
            order={[props.order ?? 200, 2]}
            query={query()}
            placeholder="Filter subagents..."
            onInput={setQuery}
          />
          <box flexDirection="row" flexWrap="wrap">
            <For each={['all', 'active', 'recent', 'errors'] as const}>
              {(value, index) => (
                <McpBulkAction
                  api={props.api}
                  interaction={props.interaction}
                  id={`${PLUGIN_ID}.subagents.filter.${value}`}
                  order={[props.order ?? 200, 3 + index()]}
                  label={`${mode() === value ? `${icons.icon('radioOn')} ` : ''}${value[0].toUpperCase() + value.slice(1)}`}
                  disabled={false}
                  onActivate={() => setMode(value)}
                />
              )}
            </For>
          </box>
          <Show when={filtered().length === 0}>
            <text fg={props.api.theme.current.textMuted}>No matching subagents</text>
          </Show>
          <For each={ids()}>
            {(id, index) => {
              const initial = byId().get(id)!
              const item = () => byId().get(id) ?? initial

              return (
                <box gap={1}>
                  <Show when={index() === 0 || visibility.visible()[index() - 1]?.group !== item().group}>
                    <text fg={props.api.theme.current.textMuted}>
                      <b>{item().group}</b>
                    </text>
                  </Show>
                  <SubagentRow
                    api={props.api}
                    interaction={props.interaction}
                    item={item()}
                    now={now()}
                    order={[props.order ?? 200, 10 + index() * 2]}
                    onOpen={() => props.controller.open(id)}
                  />
                </box>
              )
            }}
          </For>
          <ListVisibilityControl
            api={props.api}
            interaction={props.interaction}
            section="subagents"
            order={props.order ?? 200}
            visibility={visibility}
          />
        </box>
      </SectionRequestBody>
    </Section>
  )
}

function SkillRow(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  item: SkillInfo
  order: SidebarOrder
  onUse: () => void
  favorite: boolean
  favoriteDisabled: boolean
  separator: boolean
  recent: boolean
  onDetails: () => void
  onToggleFavorite: () => void
}) {
  const icons = useIcons()
  const theme = () => props.api.theme.current
  const id = () => `${PLUGIN_ID}.skill.${props.item.location || props.item.name}`
  const row = useSidebarItem(props.api, props.interaction, {
    id: id(),
    order: () => props.order,
    activate: props.onUse,
  })

  function toggleFavorite() {
    props.onToggleFavorite()
    queueMicrotask(() => props.interaction?.select(`${id()}.favorite`))
  }
  const favorite = useSidebarItem(props.api, props.interaction, {
    id: `${id()}.favorite`,
    order: () => offsetSidebarOrder(props.order, 0.5),
    disabled: () => props.favoriteDisabled,
    activate: toggleFavorite,
  })
  const details = useSidebarItem(props.api, props.interaction, {
    id: `${id()}.details`,
    order: () => offsetSidebarOrder(props.order, 0.25),
    activate: props.onDetails,
  })

  return (
    <box
      ref={(node: BoxRenderable) => row.ref(node)}
      id={id()}
      flexDirection="row"
      gap={1}
      paddingLeft={1}
      paddingRight={1}
      marginTop={props.separator ? 1 : 0}
      backgroundColor={row.backgroundColor()}
      onMouseOver={row.onMouseOver}
      onMouseOut={row.onMouseOut}
      onMouseUp={(event) => row.activate(event)}
    >
      <text flexShrink={0} fg={row.focused() ? row.foregroundColor() : theme().accent}>
        {icons.icon(props.recent ? 'recent' : 'skills')}
      </text>
      <text flexGrow={1} fg={row.foregroundColor()} wrapMode="word">
        {props.item.name}
      </text>
      <box
        ref={details.ref}
        id={`${id()}.details`}
        paddingLeft={1}
        paddingRight={1}
        backgroundColor={details.backgroundColor()}
        onMouseOver={details.onMouseOver}
        onMouseOut={details.onMouseOut}
        onMouseUp={(event) => {
          event.stopPropagation()
          details.activate(event)
        }}
      >
        <text fg={details.foregroundColor()}>{icons.icon('info')}</text>
      </box>
      <box
        ref={(node: BoxRenderable) => favorite.ref(node)}
        id={`${id()}.favorite`}
        paddingLeft={1}
        paddingRight={1}
        backgroundColor={favorite.backgroundColor()}
        onMouseOver={favorite.onMouseOver}
        onMouseOut={favorite.onMouseOut}
        onMouseUp={(event) => {
          event.stopPropagation()
          favorite.activate(event)
        }}
      >
        <text fg={favorite.focused() ? favorite.foregroundColor() : theme().warning}>
          {icons.icon(props.favorite ? 'favorite' : 'favoriteEmpty')}
        </text>
      </box>
    </box>
  )
}

export function SkillsSection(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  controller: SkillController
  preferences: PreferencesController
  order?: number
}) {
  const dialogs = useDialogs(props.api)
  const [query, setQuery] = createSignal('')
  const target = createMemo(() => props.controller.target())
  const recent = createMemo(
    () => new Map((props.preferences.recentSkills?.() ?? []).map((location, index) => [location, index])),
  )

  function skillGroup(item: SkillInfo) {
    return props.preferences.isFavoriteSkill?.(item) ? 'favorite' : recent().has(item.location) ? 'recent' : 'other'
  }
  const list = createMemo(() => {
    const favorites = props.preferences.favoriteSkills?.() ?? new Set<string>()

    return [...props.controller.list(target())]
      .sort((left, right) => {
        const isLeftFavorite = favorites.has(left.location)
        const isRightFavorite = favorites.has(right.location)

        return (
          Number(isRightFavorite) - Number(isLeftFavorite) ||
          (isLeftFavorite
            ? 0
            : (recent().get(left.location) ?? Infinity) - (recent().get(right.location) ?? Infinity)) ||
          left.name.localeCompare(right.name)
        )
      })
      .map((item) => ({ ...item }))
  })
  const filtered = createMemo(() => list().filter((item) => matchesFilter(query(), item.name, item.description)))
  const visibility = createListVisibility({
    items: filtered,
    limit: () => props.preferences.sectionItemLimit?.('skills') ?? 0,
    resetKey: () => JSON.stringify([target().key, query()]),
  })
  const state = createMemo(() => props.controller.state(target()))

  createEffect(() => {
    const current = target()
    const deactivate = untrack(() => props.controller.activate?.(current) ?? (() => {}))

    onCleanup(deactivate)
    untrack(() => void props.controller.refresh(current).catch(() => {}))
  })

  async function useSkill(item: SkillInfo) {
    try {
      const isInserted = await props.controller.use(target(), item.name)

      if (isInserted) await props.preferences.recordSkillUse?.(item)
    } catch (error) {
      if (isAbortError(error)) return

      props.api.ui.toast({
        variant: 'error',
        title: 'Skills',
        message: error instanceof Error ? error.message : `Failed to insert /${item.name}`,
        duration: 5000,
      })
    }
  }

  function selectSkill(item: SkillInfo) {
    if (!props.preferences.shouldConfirmSkill(item)) {
      void useSkill(item)

      return
    }

    showSkillDetails(item)
  }

  function showSkillDetails(item: SkillInfo) {
    dialogs.open(() => (
      <SkillDialog
        api={props.api}
        skill={item}
        onAccept={(skipConfirmation) => {
          if (skipConfirmation) props.preferences.skipSkillConfirmation(item)

          void useSkill(item)
        }}
      />
    ))
  }

  return (
    <Section
      api={props.api}
      interaction={props.interaction}
      sectionId={`${PLUGIN_ID}.section.skills`}
      order={props.order ?? 300}
      title="SKILLS"
      section="skills"
      summary={String(list().length)}
      open={props.preferences.expanded().skills}
      onToggle={() => props.preferences.toggleSectionExpanded('skills')}
    >
      <SectionRequestBody
        api={props.api}
        interaction={props.interaction}
        id={`${PLUGIN_ID}.retry.skills`}
        order={[props.order ?? 300, 1]}
        state={state()}
        hasItems={list().length > 0}
        empty="No skills"
        loading="Loading skills…"
        onRetry={() => void props.controller.retry(target())}
      >
        <box>
          <SectionFilter
            api={props.api}
            interaction={props.interaction}
            id={`${PLUGIN_ID}.filter.skills`}
            order={[props.order ?? 300, 2]}
            query={query()}
            placeholder="Filter skills..."
            onInput={setQuery}
          />
          <Show
            when={filtered().length > 0}
            fallback={<text fg={props.api.theme.current.textMuted}>No matching skills</text>}
          >
            <box>
              <For each={visibility.visible()}>
                {(item, index) => (
                  <SkillRow
                    api={props.api}
                    interaction={props.interaction}
                    item={item}
                    order={[props.order ?? 300, 10 + index() * 2]}
                    onUse={() => selectSkill(item)}
                    onDetails={() => showSkillDetails(item)}
                    recent={recent().has(item.location)}
                    favorite={props.preferences.isFavoriteSkill?.(item) ?? false}
                    favoriteDisabled={props.preferences.ready?.() === false}
                    separator={index() > 0 && skillGroup(visibility.visible()[index() - 1]) !== skillGroup(item)}
                    onToggleFavorite={() => props.preferences.toggleFavoriteSkill?.(item)}
                  />
                )}
              </For>
              <ListVisibilityControl
                api={props.api}
                interaction={props.interaction}
                section="skills"
                order={props.order ?? 300}
                visibility={visibility}
              />
            </box>
          </Show>
        </box>
      </SectionRequestBody>
    </Section>
  )
}

function QuickActionRow(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  action: (typeof QUICK_ACTIONS)[number]
  order: SidebarOrder
}) {
  const icons = useIcons()
  const theme = () => props.api.theme.current
  const shortcut = createMemo(() => {
    const bindings = props.api.keymap.getCommandBindings({
      visibility: 'registered',
      commands: [props.action.command],
    })

    return props.api.keys.formatBindings(bindings.get(props.action.command))
  })

  function run() {
    const result = props.interaction
      ? props.interaction.dispatchFromReturnTarget(props.action.command)
      : props.api.keymap.dispatchCommand(props.action.command)

    if (result.ok) return

    props.api.ui.toast({
      variant: 'warning',
      title: props.action.label,
      message: `Command is ${result.reason}`,
      duration: 3000,
    })
  }
  const id = () => `${PLUGIN_ID}.quick-action.${props.action.command}`
  const row = useSidebarItem(props.api, props.interaction, {
    id: id(),
    order: () => props.order,
    activate: run,
  })

  return (
    <box
      ref={(node: BoxRenderable) => row.ref(node)}
      id={id()}
      flexDirection="row"
      gap={1}
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={row.backgroundColor()}
      onMouseOver={row.onMouseOver}
      onMouseOut={row.onMouseOut}
      onMouseDown={(event) => row.activate(event)}
    >
      <text flexShrink={0} fg={row.focused() ? row.foregroundColor() : theme().accent}>
        {icons.action(props.action.command)}
      </text>
      <text flexGrow={1} fg={row.foregroundColor()}>
        {props.action.label}
      </text>
      <Show when={shortcut()}>
        {(value) => (
          <text flexShrink={0} fg={row.focused() ? row.foregroundColor() : theme().textMuted} wrapMode="none">
            {value()}
          </text>
        )}
      </Show>
    </box>
  )
}

export function QuickActionsSection(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  interaction?: SidebarInteraction
  order?: number
}) {
  const actions = createMemo(() =>
    (props.preferences.quickActionOrder?.() ?? QUICK_ACTIONS.map((action) => action.command)).flatMap((id) => {
      const action = QUICK_ACTIONS.find((candidate) => candidate.command === id)

      return action && props.preferences.quickActionVisible?.(id) !== false ? [{ ...action }] : []
    }),
  )
  const visibility = createListVisibility({
    items: actions,
    limit: () => props.preferences.sectionItemLimit?.('quick_actions') ?? 0,
    resetKey: () => currentLocation(props.api).key,
  })

  return (
    <Section
      api={props.api}
      interaction={props.interaction}
      sectionId={`${PLUGIN_ID}.section.quick_actions`}
      order={props.order ?? 400}
      title="QUICK ACTIONS"
      section="quick_actions"
      summary={String(actions().length)}
      open={props.preferences.expanded().quick_actions}
      onToggle={() => props.preferences.toggleSectionExpanded('quick_actions')}
    >
      <box>
        <Show when={actions().length === 0}>
          <text fg={props.api.theme.current.textMuted}>No quick actions selected</text>
        </Show>
        <For each={visibility.visible()}>
          {(action, index) => (
            <QuickActionRow
              api={props.api}
              interaction={props.interaction}
              action={action}
              order={[props.order ?? 400, 10 + index() * 2]}
            />
          )}
        </For>
        <ListVisibilityControl
          api={props.api}
          interaction={props.interaction}
          section="quick_actions"
          order={props.order ?? 400}
          visibility={visibility}
        />
      </box>
    </Section>
  )
}

export function LspBadge(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  id: string
  navigationId?: string
  order?: SidebarOrder
  status: TuiSidebarLspItem['status']
  iconStyle?: LspIconStyle
  onOpen?: () => void
}) {
  const icons = useIcons()
  const isKnown = lspIconName(props.id) !== undefined
  const [showName, setShowName] = createSignal(false)
  const statusColor = () =>
    props.status === 'connected' ? props.api.theme.current.success : props.api.theme.current.error

  if (!isKnown && !props.onOpen) {
    // Legacy badges without an action stay noninteractive for their mounted lifetime.
    // eslint-disable-next-line solid/components-return-once
    return (
      <text flexShrink={1} fg={statusColor()} wrapMode="none">
        {props.id}
      </text>
    )
  }

  const item = useSidebarItem(
    props.api,
    props.interaction,
    {
      id: props.navigationId ?? `${PLUGIN_ID}.lsp.${props.id}`,
      order: () => props.order ?? 0,
      activate: () => (props.onOpen ? props.onOpen() : setShowName((value) => !value)),
    },
    statusColor,
  )

  return (
    <box
      ref={(node: BoxRenderable) => item.ref(node)}
      id={props.navigationId ?? `${PLUGIN_ID}.lsp.${props.id}`}
      flexDirection="row"
      gap={1}
      flexShrink={0}
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={item.backgroundColor()}
      onMouseOver={item.onMouseOver}
      onMouseOut={item.onMouseOut}
      onMouseDown={(event) => {
        event.stopPropagation()

        if (!props.onOpen) item.activate(event)
      }}
      onMouseUp={(event) => {
        event.stopPropagation()

        if (props.onOpen) item.activate(event)
      }}
    >
      <text flexShrink={0} fg={item.foregroundColor()}>
        {lspIcon(props.id, props.iconStyle ?? icons.style())}
      </text>
      <Show when={showName()}>
        <text
          flexShrink={0}
          fg={item.focused() ? item.foregroundColor() : props.api.theme.current.textMuted}
          wrapMode="none"
        >
          {props.id}
        </text>
      </Show>
    </box>
  )
}

export function LspSection(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  interaction?: SidebarInteraction
  order?: number
}) {
  const dialogs = useDialogs(props.api)
  const list = createMemo(() =>
    [...props.api.state.lsp()].sort(
      (a, b) =>
        Number(b.status === 'error') - Number(a.status === 'error') ||
        a.id.localeCompare(b.id) ||
        a.root.localeCompare(b.root),
    ),
  )
  const visibility = createListVisibility({
    items: list,
    limit: () => props.preferences.sectionItemLimit?.('lsp') ?? 0,
    resetKey: () => currentLocation(props.api).key,
  })
  const connected = createMemo(() => list().filter((item) => item.status === 'connected').length)
  const disabled = createMemo(() => props.api.state.config.lsp === false)

  return (
    <Section
      api={props.api}
      interaction={props.interaction}
      sectionId={`${PLUGIN_ID}.section.lsp`}
      order={props.order ?? 500}
      title="LSP"
      section="lsp"
      summary={`${connected()}/${list().length}`}
      open={props.preferences.expanded().lsp}
      onToggle={() => props.preferences.toggleSectionExpanded('lsp')}
    >
      <Show
        when={list().length > 0}
        fallback={
          <text fg={props.api.theme.current.textMuted}>
            {disabled() ? 'LSP is disabled' : 'Activates as files are read'}
          </text>
        }
      >
        <box flexDirection="row" flexWrap="wrap" gap={1} paddingLeft={1} paddingRight={1}>
          <For each={visibility.visible()}>
            {(item: TuiSidebarLspItem, index) => (
              <LspBadge
                api={props.api}
                interaction={props.interaction}
                id={item.id}
                navigationId={`${PLUGIN_ID}.lsp.${item.id}.${item.root}`}
                order={[props.order ?? 500, 10 + index() * 2]}
                status={item.status}
                onOpen={() => {
                  dialogs.open(() => <LspDetailsDialog api={props.api} server={item} />)
                }}
              />
            )}
          </For>
        </box>
      </Show>
      <ListVisibilityControl
        api={props.api}
        interaction={props.interaction}
        section="lsp"
        order={props.order ?? 500}
        visibility={visibility}
      />
    </Section>
  )
}

function mcpColor(api: TuiPluginApi, status: string) {
  const theme = api.theme.current

  if (status === 'connected') return theme.success

  if (status === 'failed' || status === 'needs_client_registration') return theme.error

  if (status === 'needs_auth') return theme.warning

  return theme.textMuted
}

function mcpToggle(status: string, busy: boolean) {
  return busy || status === 'pending' ? 'pending' : status === 'connected' ? 'connected' : 'disconnected'
}

function McpRow(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  item: TuiSidebarMcpItem
  order: SidebarOrder
  state: TargetRequestState
  disabled: boolean
  onToggle: () => void
  onRetry: () => void
  favorite: boolean
  favoriteDisabled: boolean
  separator: boolean
  onToggleFavorite: () => void
}) {
  const icons = useIcons()
  const theme = () => props.api.theme.current
  const busy = () => props.state.status === 'loading' || props.state.status === 'refreshing'
  const error = () => props.state.error
  const disabled = () => props.disabled || busy()
  const id = () => `${PLUGIN_ID}.mcp.${props.item.name}`
  const row = useSidebarItem(props.api, props.interaction, {
    id: id(),
    order: () => props.order,
    disabled,
    activate: props.onToggle,
  })
  const star = useSidebarItem(props.api, props.interaction, {
    id: `${id()}.favorite`,
    order: () => offsetSidebarOrder(props.order, 0.25),
    disabled: () => props.favoriteDisabled,
    activate: () => {
      props.onToggleFavorite()
      queueMicrotask(() => props.interaction?.select(`${id()}.favorite`))
    },
  })

  return (
    <box
      ref={(node: BoxRenderable) => row.ref(node)}
      id={id()}
      backgroundColor={row.backgroundColor()}
      paddingLeft={1}
      paddingRight={1}
      paddingTop={props.item.error || error() ? 1 : 0}
      paddingBottom={props.item.error || error() ? 1 : 0}
      marginTop={props.separator ? 1 : 0}
      onMouseOver={row.onMouseOver}
      onMouseOut={row.onMouseOut}
      onMouseDown={(event) => row.activate(event)}
    >
      <box flexDirection="row" justifyContent="space-between" gap={1}>
        <text
          fg={
            row.focused() || disabled()
              ? row.foregroundColor()
              : props.item.status === 'connected'
                ? theme().text
                : theme().textMuted
          }
          wrapMode="none"
        >
          {props.item.name}
        </text>
        <box flexDirection="row" flexShrink={0} gap={1}>
          <text fg={row.focused() ? row.foregroundColor() : mcpColor(props.api, props.item.status)}>
            <b>{icons.icon(mcpToggle(props.item.status, busy()))}</b>
          </text>
          <box
            ref={star.ref}
            id={`${id()}.favorite`}
            backgroundColor={star.backgroundColor()}
            onMouseOver={star.onMouseOver}
            onMouseOut={star.onMouseOut}
            onMouseDown={(event) => event.stopPropagation()}
            onMouseUp={(event) => {
              event.stopPropagation()
              star.activate(event)
            }}
          >
            <text fg={star.focused() || props.favoriteDisabled ? star.foregroundColor() : theme().warning}>
              {icons.icon(props.favorite ? 'favorite' : 'favoriteEmpty')}
            </text>
          </box>
        </box>
      </box>
      <Show when={props.item.error}>
        <text fg={row.focused() ? row.foregroundColor() : theme().error} wrapMode="word">
          {props.item.error}
        </text>
      </Show>
      <RequestErrorRow
        api={props.api}
        interaction={props.interaction}
        id={`${id()}.retry`}
        order={offsetSidebarOrder(props.order, 0.5)}
        state={props.state}
        onRetry={props.onRetry}
      />
    </box>
  )
}

function McpBulkAction(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  id: string
  order: SidebarOrder
  label: string
  disabled: boolean
  onActivate: () => void
}) {
  const item = useSidebarItem(props.api, props.interaction, {
    id: props.id,
    order: () => props.order,
    disabled: () => props.disabled,
    activate: props.onActivate,
  })

  return (
    <box
      ref={(node: BoxRenderable) => item.ref(node)}
      id={props.id}
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={item.backgroundColor()}
      onMouseOver={item.onMouseOver}
      onMouseOut={item.onMouseOut}
      onMouseDown={(event) => item.activate(event)}
    >
      <text fg={item.foregroundColor()}>{props.label}</text>
    </box>
  )
}

export function McpSection(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  controller: McpController
  preferences: PreferencesController
  order?: number
}) {
  const icons = useIcons()
  const [query, setQuery] = createSignal('')
  const target = createMemo(() => props.controller.target())
  const favorites = createMemo(() => props.preferences.favoriteMcpServers?.() ?? new Set<string>())
  const list = createMemo(() =>
    [...props.controller.list(target())]
      .sort((a, b) => Number(favorites().has(b.name)) - Number(favorites().has(a.name)) || a.name.localeCompare(b.name))
      .map((item) => ({ ...item })),
  )
  const filtered = createMemo(() => list().filter((item) => matchesFilter(query(), item.name)))
  const visibility = createListVisibility({
    items: filtered,
    limit: () => props.preferences.sectionItemLimit?.('mcp') ?? 0,
    resetKey: () => JSON.stringify([target().key, query()]),
  })
  const active = createMemo(() => list().filter((item) => item.status === 'connected').length)
  const state = createMemo(() => props.controller.state(target()))
  const bulk = createMemo(
    () =>
      props.controller.bulkState?.(target()) ?? {
        action: 'connect' as const,
        status: 'idle' as const,
        completed: 0,
        total: 0,
        failed: [],
      },
  )
  const bulkRunning = createMemo(() => bulk().status === 'running')
  const mutationRunning = createMemo(() => props.controller.mutating?.(target()))
  const connectable = createMemo(() => list().filter((item) => mcpToggleAction(item.status) === 'connect').length)
  const disconnectable = createMemo(() => list().filter((item) => mcpToggleAction(item.status) === 'disconnect').length)
  const errors = createMemo(
    () =>
      list().filter(
        (item) =>
          item.status === 'failed' || item.status === 'needs_auth' || item.status === 'needs_client_registration',
      ).length,
  )
  const summary = createMemo(
    () => `${active()}/${list().length}${errors() ? ` · ${errors()} ${icons.icon('error')}` : ''}`,
  )
  const presetName = createMemo(() => {
    const presets = props.preferences.mcpPresets?.() ?? {}
    const selected = props.controller.selectedPreset?.(target())

    return selected && Object.hasOwn(presets, selected) ? selected : matchingMcpPreset(list(), presets)
  })

  async function toggle(name: string) {
    await props.controller.toggle(name).catch(() => {})
  }

  return (
    <SectionWithHeaderAction
      api={props.api}
      interaction={props.interaction}
      sectionId={`${PLUGIN_ID}.section.mcp`}
      order={props.order ?? 600}
      title="MCP"
      section="mcp"
      summary={summary()}
      headerAction={{
        id: `${PLUGIN_ID}.mcp.presets`,
        order: [props.order ?? 600, 0.5],
        label: () => `${icons.icon('presets')} ${presetName() ? `Preset: ${presetName()}` : 'Preset'}`,
        disabled: () => bulkRunning() || mutationRunning() || props.preferences.ready?.() === false,
        onActivate: () => openMcpPresets(props.api, props.controller, props.preferences),
      }}
      open={props.preferences.expanded().mcp}
      onToggle={() => props.preferences.toggleSectionExpanded('mcp')}
    >
      <SectionRequestBody
        api={props.api}
        interaction={props.interaction}
        id={`${PLUGIN_ID}.retry.mcp`}
        order={[props.order ?? 600, 1]}
        state={state()}
        hasItems={list().length > 0}
        empty="No MCP servers"
        loading="Loading MCP servers…"
        onRetry={() => void props.controller.retry(target())}
      >
        <box>
          <box flexDirection="row" gap={1} paddingBottom={bulkRunning() || bulk().status === 'error' ? 1 : 0}>
            <McpBulkAction
              api={props.api}
              interaction={props.interaction}
              id={`${PLUGIN_ID}.mcp.connect-all`}
              order={[props.order ?? 600, 2]}
              label={`${icons.icon('connected')} Connect all`}
              disabled={bulkRunning() || mutationRunning() || connectable() === 0}
              onActivate={() => void props.controller.connectAll(target())}
            />
            <McpBulkAction
              api={props.api}
              interaction={props.interaction}
              id={`${PLUGIN_ID}.mcp.disconnect-all`}
              order={[props.order ?? 600, 3]}
              label={`${icons.icon('disconnected')} Disconnect all`}
              disabled={bulkRunning() || mutationRunning() || disconnectable() === 0}
              onActivate={() => void props.controller.disconnectAll(target())}
            />
          </box>
          <Show when={bulkRunning()}>
            <text fg={props.api.theme.current.textMuted}>
              {bulk().action === 'connect'
                ? 'Connecting'
                : bulk().action === 'disconnect'
                  ? 'Disconnecting'
                  : `Applying ${bulk().preset}`}{' '}
              {bulk().completed}/{bulk().total}…
            </text>
          </Show>
          <Show when={bulk().status === 'error'}>
            <McpBulkAction
              api={props.api}
              interaction={props.interaction}
              id={`${PLUGIN_ID}.mcp.retry-all`}
              order={[props.order ?? 600, 4]}
              label={`${icons.icon('retry')} Retry ${bulk().failed.length} failed`}
              disabled={false}
              onActivate={() => void props.controller.retryBulk(target())}
            />
          </Show>
          <SectionFilter
            api={props.api}
            interaction={props.interaction}
            id={`${PLUGIN_ID}.filter.mcp`}
            order={[props.order ?? 600, 5]}
            query={query()}
            placeholder="Filter MCP..."
            onInput={setQuery}
          />
          <Show
            when={filtered().length > 0}
            fallback={<text fg={props.api.theme.current.textMuted}>No matching MCP servers</text>}
          >
            <box>
              <For each={visibility.visible()}>
                {(item, index) => (
                  <McpRow
                    api={props.api}
                    interaction={props.interaction}
                    item={item}
                    order={[props.order ?? 600, 10 + index() * 2]}
                    state={props.controller.serverState(item.name, target())}
                    disabled={bulkRunning()}
                    onToggle={() => void toggle(item.name)}
                    onRetry={() => void props.controller.retryServer(item.name, target())?.catch(() => {})}
                    favorite={favorites().has(item.name)}
                    favoriteDisabled={props.preferences.ready?.() === false}
                    separator={
                      index() > 0 &&
                      favorites().has(visibility.visible()[index() - 1].name) &&
                      !favorites().has(item.name)
                    }
                    onToggleFavorite={() => props.preferences.toggleFavoriteMcpServer?.(item.name)}
                  />
                )}
              </For>
              <ListVisibilityControl
                api={props.api}
                interaction={props.interaction}
                section="mcp"
                order={props.order ?? 600}
                visibility={visibility}
              />
            </box>
          </Show>
        </box>
      </SectionRequestBody>
    </SectionWithHeaderAction>
  )
}
