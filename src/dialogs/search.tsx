import {
  type InputRenderable,
  RGBA,
  type Renderable,
  type ScrollBoxRenderable,
  TextAttributes,
  parseColor,
} from '@opentui/core'
import { useTerminalDimensions } from '@opentui/solid'
import { For, Show, batch, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js'

import { SelectionBox } from '../components/selection-box'
import { PLUGIN_ID } from '../constants'
import { isAbortError } from '../controllers/request-state'
import { useIcons } from '../icons/context'
import { QUICK_ACTION_IDS } from '../quick-actions'
import {
  SEARCH_GROUPS,
  SEARCH_SECTIONS,
  type SearchGroup,
  buildSearchCandidates,
  searchContext,
  searchResults,
} from '../search'
import { buildSubagentView } from '../subagent-view'

import { createDialogStack, useDialogState, useDialogs } from './context'
import { SkillDialog } from './skill'

import type { McpController } from '../controllers/mcp'
import type { PreferencesController } from '../controllers/preferences'
import type { SkillController, SkillInfo } from '../controllers/skills'
import type { SubagentController } from '../controllers/subagents'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export type SearchServices = {
  api: TuiPluginApi
  preferences: PreferencesController
  skills: SkillController
  subagents: SubagentController
  mcp: McpController
}

function mixColor(from: RGBA, to: RGBA, amount: number) {
  return RGBA.fromValues(
    from.r + (to.r - from.r) * amount,
    from.g + (to.g - from.g) * amount,
    from.b + (to.b - from.b) * amount,
  )
}

export function SearchEverythingDialog(props: SearchServices & { returnTarget?: Renderable | null }) {
  const context = searchContext(props.api)
  const skillTarget = props.skills.target()
  const mcpTarget = props.mcp.target()
  const [query, setQuery] = useDialogState('query', '')
  const [activeTab, setActiveTab] = useDialogState<SearchGroup>('tab', 'Skills')
  const [selectedID, setSelectedID] = useDialogState<string | undefined>('selection', undefined)
  const [views] = useDialogState('tab-views', new Map<SearchGroup, { selectedID?: string; scrollTop: number }>())
  const tabViews = views()
  const [scrollTop, setScrollTop] = useDialogState('scroll', 0)
  const [refreshing, setRefreshing] = createSignal(false)
  const theme = () => props.api.theme.current
  const icons = useIcons()
  const dialogs = useDialogs(props.api)
  const resultColors = createMemo(() => {
    const background = parseColor(theme().backgroundPanel)
    const contrast = background.r * 0.299 + background.g * 0.587 + background.b * 0.114 > 0.5 ? 0 : 1

    return {
      title: mixColor(parseColor(theme().text), RGBA.fromValues(contrast, contrast, contrast), 0.45),
      description: mixColor(parseColor(theme().textMuted), background, 0.4),
    }
  })
  const dimensions = useTerminalDimensions()
  let input: InputRenderable | undefined
  let body: ScrollBoxRenderable | undefined
  let pendingScroll: number | string | undefined = scrollTop()
  let isDisposed = false
  let refreshGeneration = 0
  const sameContext = () => searchContext(props.api).key === context.key
  const candidates = createMemo(() =>
    buildSearchCandidates({
      skills: props.skills.list(skillTarget),
      subagents: context.sessionID
        ? buildSubagentView(props.subagents.list(context.sessionID), props.subagents.recent(context.sessionID))
        : [],
      mcp: props.mcp.list(mcpTarget),
      actionOrder: props.preferences.quickActionOrder?.() ?? QUICK_ACTION_IDS,
      favoriteSkills: props.preferences.favoriteSkills(),
      recentSkills: props.preferences.recentSkills(),
      favoriteMcp: props.preferences.favoriteMcpServers(),
      hasSession: Boolean(context.sessionID),
      mcpBusy: props.mcp.mutating(mcpTarget) || props.mcp.bulkState(mcpTarget).status === 'running',
    }),
  )
  const matches = createMemo(() => searchResults(candidates(), query()))
  const results = createMemo(() => matches().filter((item) => item.group === activeTab()))
  // Query/tab changes start a new view; background data updates retain row identities.
  const queryScope = createMemo(() => ({ query: query(), tab: activeTab() }))
  const byID = createMemo(() => new Map(results().map((item) => [item.id, item])))
  const active = createMemo(() => results().find((item) => item.id === selectedID()) ?? results()[0])
  const sources = createMemo(() => [
    { group: 'Skills', state: props.skills.state(skillTarget) },
    { group: 'MCP', state: props.mcp.state(mcpTarget) },
    ...(context.sessionID ? [{ group: 'Subagents', state: props.subagents.state(context.sessionID) }] : []),
  ])
  const loading = createMemo(
    () => refreshing() && sources().some(({ group, state }) => group === activeTab() && state.status === 'loading'),
  )
  const allErrors = createMemo(
    (previous: ReturnType<typeof sources>) =>
      sources().flatMap((source) => {
        if (source.state.error) return [source]

        return source.state.status === 'refreshing' ? previous.filter((item) => item.group === source.group) : []
      }),
    [],
  )
  const errors = createMemo(() => allErrors().filter((source) => source.group === activeTab()))

  async function refresh(force = false) {
    const generation = ++refreshGeneration

    setRefreshing(true)
    try {
      await props.preferences.load()

      if (isDisposed || !sameContext()) return

      await Promise.allSettled([
        props.skills.refresh(skillTarget, force),
        props.mcp.refresh(mcpTarget, force),
        ...(context.sessionID ? [props.subagents.refresh(context.sessionID, force)] : []),
      ])
    } finally {
      if (!isDisposed && generation === refreshGeneration) setRefreshing(false)
    }
  }
  function scrollToResult(id: string) {
    pendingScroll = id
    body?.requestRender()
  }
  function move(offset: number) {
    const items = results()

    if (items.length === 0) return

    const index = items.findIndex((item) => item.id === active()?.id)
    const id = items[(index + offset + items.length) % items.length].id

    setSelectedID(id)
    scrollToResult(id)
  }
  function selectTab(tab: SearchGroup) {
    if (tab !== activeTab()) {
      tabViews.set(activeTab(), { selectedID: active()?.id, scrollTop: body?.scrollTop ?? 0 })
      const saved = tabViews.get(tab)

      pendingScroll = saved?.scrollTop ?? 0
      batch(() => {
        setActiveTab(tab)
        setSelectedID(saved?.selectedID)
      })
    }

    input?.focus()
  }
  function moveTab(offset: number) {
    selectTab(
      SEARCH_GROUPS[(SEARCH_GROUPS.indexOf(activeTab()) + offset + SEARCH_GROUPS.length) % SEARCH_GROUPS.length],
    )
  }
  function report(cause: unknown) {
    if (isAbortError(cause)) return

    props.api.ui.toast({
      title: 'Search Everything',
      variant: 'error',
      message: cause instanceof Error ? cause.message : 'Action failed',
      duration: 4000,
    })
  }
  async function insertSkill(skill: SkillInfo) {
    if (!sameContext()) return

    if (await props.skills.use(skillTarget, skill.name)) await props.preferences.recordSkillUse(skill)
  }
  function activate(id = active()?.id) {
    if (isDisposed || !sameContext()) return

    const item = results().find((candidate) => candidate.id === id)

    if (!item || item.disabled) return

    setSelectedID(item.id)

    if (body) setScrollTop(body.scrollTop)

    if (item.group === 'Skills' && props.preferences.shouldConfirmSkill(item.skill)) {
      dialogs.open(() => (
        <SkillDialog
          api={props.api}
          skill={item.skill}
          onAccept={(skip) => {
            if (!sameContext()) return

            if (skip) props.preferences.skipSkillConfirmation(item.skill)

            void insertSkill(item.skill).catch(report)
          }}
        />
      ))

      return
    }

    if (item.group === 'MCP') {
      void props.mcp.toggle(item.server).catch(report)

      return
    }

    dialogs.close()

    switch (item.group) {
      case 'Skills': {
        void insertSkill(item.skill).catch(report)
        break
      }

      case 'Subagents': {
        props.subagents.open(item.sessionID)
        break
      }

      case 'Actions': {
        const target = props.returnTarget?.parent && !props.returnTarget.isDestroyed ? props.returnTarget : null

        target?.focus()
        const result = props.api.keymap.dispatchCommand(item.command, { target, focused: target })

        if (!result.ok) report(new Error(`Action is ${result.reason}`))

        break
      }
      // No default
    }
  }
  const prefix = `${PLUGIN_ID}.search-dialog`
  const unregister = props.api.keymap.registerLayer({
    mode: 'modal',
    priority: 1000,
    commands: [
      { name: `${prefix}.previous`, run: () => move(-1) },
      { name: `${prefix}.next`, run: () => move(1) },
      { name: `${prefix}.select`, run: () => activate() },
      { name: `${prefix}.close`, run: dialogs.back },
      { name: `${prefix}.next-tab`, run: () => moveTab(1) },
      { name: `${prefix}.previous-tab`, run: () => moveTab(-1) },
      { name: `${prefix}.retry`, run: () => void refresh(true).catch(report) },
    ],
    bindings: [
      { key: 'up', cmd: `${prefix}.previous` },
      { key: 'down', cmd: `${prefix}.next` },
      { key: 'return', cmd: `${prefix}.select` },
      { key: 'escape', cmd: `${prefix}.close` },
      { key: 'tab', cmd: `${prefix}.next-tab` },
      { key: 'shift+tab', cmd: `${prefix}.previous-tab` },
      { key: 'ctrl+r', cmd: `${prefix}.retry` },
    ],
  })

  onCleanup(() => {
    isDisposed = true
    unregister()
  })
  onMount(() => {
    input?.focus()
    void refresh().catch(report)
  })
  createEffect(() => {
    if (!sameContext()) dialogs.close()
  })

  return (
    <box
      id={prefix}
      marginTop={-Math.min(6, Math.floor(dimensions().height / 10))}
      backgroundColor={theme().backgroundPanel}
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
      gap={1}
    >
      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme().text} attributes={TextAttributes.BOLD}>
          {icons.icon('search')} Search Everything
        </text>
        <text
          fg={theme().textMuted}
          onMouseUp={(event) => {
            event.stopPropagation()
            dialogs.back()
          }}
        >
          {icons.key('esc')}
        </text>
      </box>
      <SelectionBox backgroundColor={theme().backgroundElement} height={1}>
        <input
          ref={(node) => (input = node)}
          value={query()}
          placeholder="Search skills, subagents, MCP, actions..."
          focused
          textColor={theme().text}
          focusedTextColor={theme().text}
          placeholderColor={theme().textMuted}
          backgroundColor="transparent"
          focusedBackgroundColor="transparent"
          onInput={(value) => {
            tabViews.clear()
            pendingScroll = 0
            setQuery(value)
            setSelectedID(undefined)
          }}
        />
      </SelectionBox>
      <box flexDirection="row" flexWrap="wrap" gap={1}>
        <For each={SEARCH_GROUPS}>
          {(tab) => (
            <SelectionBox
              id={`${prefix}.tab.${tab.toLowerCase()}`}
              paddingLeft={1}
              paddingRight={1}
              backgroundColor={activeTab() === tab ? theme().backgroundElement : undefined}
              onMouseDown={(event) => {
                event.preventDefault()
                event.stopPropagation()
              }}
              onMouseUp={(event) => {
                event.stopPropagation()
                selectTab(tab)
              }}
            >
              <text
                fg={activeTab() === tab ? theme().accent : theme().textMuted}
                attributes={activeTab() === tab ? TextAttributes.BOLD : undefined}
                wrapMode="none"
              >
                {icons.section(SEARCH_SECTIONS[tab])} {tab} ({matches().filter((item) => item.group === tab).length})
                {allErrors().some((source) => source.group === tab) ? ' !' : ''}
              </text>
            </SelectionBox>
          )}
        </For>
      </box>
      <scrollbox
        id={`${prefix}.results`}
        ref={(node) => (body = node)}
        renderBefore={() => {
          // Apply restored positions only after the new tab's content has been laid out.
          const position = pendingScroll

          pendingScroll = undefined

          if (!body || position === undefined) return

          if (typeof position === 'number') body.scrollTo(position)
          else body.scrollChildIntoView(`${prefix}.${position}`)
        }}
        renderAfter={() => {
          if (body) setScrollTop(body.scrollTop)
        }}
        height={Math.min(
          Math.max(3, Math.min(16, Math.floor(dimensions().height * 0.5) - 9)),
          Math.max(1, results().length * 3 + errors().length * 2),
        )}
        contentOptions={{ minHeight: 0 }}
        scrollX={false}
      >
        <For each={errors()}>
          {({ group, state }) => (
            <text fg={theme().error} wrapMode="word">
              {icons.icon('error')} {group}: {state.error?.message} · {icons.key('ctrl+r')} {icons.icon('retry')} retry
            </text>
          )}
        </For>
        <Show
          when={results().length}
          fallback={
            <text fg={theme().textMuted}>
              {icons.icon(loading() ? 'pending' : 'search')} {loading() ? 'Loading sources…' : 'No matching results'}
            </text>
          }
        >
          <Show keyed when={queryScope()}>
            {(_scope) => (
              <For each={results().map((item) => item.id)}>
                {(id) => {
                  const initial = byID().get(id)!
                  const item = () => byID().get(id) ?? initial
                  const actionIcon = () => {
                    const result = item()

                    return result.group === 'Actions' ? `${icons.action(result.command)} ` : ''
                  }

                  return (
                    <SelectionBox
                      id={`${prefix}.${id}`}
                      height={2}
                      marginBottom={1}
                      paddingLeft={1}
                      paddingRight={1}
                      backgroundColor={active()?.id === id ? theme().backgroundElement : undefined}
                      onMouseOver={() => setSelectedID(id)}
                      onMouseDown={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                      }}
                      onMouseUp={(event) => {
                        event.stopPropagation()
                        activate(id)
                      }}
                    >
                      {/* Keep text within the padding reserved for the corner masks. */}
                      <box overflow="hidden">
                        <text
                          fg={
                            item().disabled
                              ? theme().textMuted
                              : active()?.id === id
                                ? theme().accent
                                : resultColors().title
                          }
                          attributes={TextAttributes.BOLD}
                          wrapMode="none"
                          truncate
                          height={1}
                        >
                          {active()?.id === id ? `${icons.icon('selected')} ` : '  '}
                          {actionIcon()}
                          {item().title}
                        </text>
                        <box paddingLeft={item().group === 'Actions' && icons.style() === 'text' ? 6 : 4} height={1}>
                          <text
                            fg={resultColors().description}
                            attributes={TextAttributes.DIM}
                            wrapMode="none"
                            truncate
                            height={1}
                          >
                            {(item().disabled ?? item().description).replaceAll(/\s+/g, ' ')}
                          </text>
                        </box>
                      </box>
                    </SelectionBox>
                  )
                }}
              </For>
            )}
          </Show>
        </Show>
      </scrollbox>
      <text fg={theme().textMuted} wrapMode="word">
        {icons.key('up/down')} select · {icons.key('tab/shift+tab')} switch · {icons.key('enter')} activate ·{' '}
        {icons.key('esc')} close
      </text>
    </box>
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
  ).open(() => <SearchEverythingDialog {...services} returnTarget={returnTarget} />, 'large')
}
