import type { TuiPluginApi, TuiSidebarLspItem, TuiSidebarMcpItem } from "@opencode-ai/plugin/tui"
import { type BoxRenderable, TextAttributes } from "@opentui/core"
import { createEffect, createMemo, createSignal, For, type JSX, onCleanup, Show, untrack } from "solid-js"
import { QUICK_ACTIONS } from "../constants"
import type { McpController } from "../controllers/mcp"
import type { PreferencesController } from "../controllers/preferences"
import type { SkillController, SkillInfo } from "../controllers/skills"
import type { SubagentController } from "../controllers/subagents"
import type { SidebarTodo, TodoController } from "../controllers/todo"
import { isAbortError, type TargetRequestState } from "../controllers/request-state"
import { SkillDialog } from "../dialogs/skill"
import { lspIcon, lspIconName, type LspIconStyle } from "../icons/lsp"
import type { SidebarInteraction } from "../sidebar-interaction"
import { mcpToggleAction } from "../state"
import { matchesFilter, Section, SectionFilter, useSidebarItem } from "./common"

function RequestErrorRow(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  id: string
  order: number
  state: TargetRequestState
  onRetry: () => void
}) {
  const item = useSidebarItem(props.api, props.interaction, {
    id: props.id,
    order: () => props.order,
    disabled: () =>
      !props.state.error?.retryable || props.state.status === "loading" || props.state.status === "refreshing",
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
            {error().message}
          </text>
          <Show when={error().retryable}>
            <text flexShrink={0} fg={item.focused() ? item.foregroundColor() : props.api.theme.current.accent}>
              Retry
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
  order: number
  state: TargetRequestState
  hasItems: boolean
  empty: string
  loading: string
  onRetry: () => void
  children: JSX.Element
}) {
  const pending = () => props.state.status === "loading" || props.state.status === "refreshing"
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
        <text fg={props.api.theme.current.textMuted}>{props.loading}</text>
      </Show>
      <Show when={props.state.status === "refreshing" && props.hasItems}>
        <text fg={props.api.theme.current.textMuted}>Refreshing…</text>
      </Show>
      <Show when={props.hasItems}>{props.children}</Show>
      <Show when={props.state.status === "ready" && !props.hasItems && !props.state.error}>
        <text fg={props.api.theme.current.textMuted}>{props.empty}</text>
      </Show>
    </box>
  )
}

function TodoRow(props: { api: TuiPluginApi; item: SidebarTodo }) {
  const theme = () => props.api.theme.current
  const done = () => props.item.status === "completed"
  const active = () => props.item.status === "in_progress"
  const cancelled = () => props.item.status === "cancelled"
  const priorityLabel = () => {
    if (props.item.priority === "high") return "↑"
    if (props.item.priority === "medium") return "•"
    if (props.item.priority === "low") return "↓"
    return "?"
  }
  const priorityColor = () => {
    if (props.item.priority === "high") return theme().error
    if (props.item.priority === "medium") return theme().warning
    return theme().info
  }

  return (
    <box flexDirection="row" gap={1}>
      <text
        flexShrink={0}
        fg={active() ? theme().warning : done() ? theme().success : cancelled() ? theme().error : theme().textMuted}
      >
        {done() ? "✓" : active() ? "●" : cancelled() ? "×" : "○"}
      </text>
      <text
        flexGrow={1}
        fg={active() ? theme().primary : theme().textMuted}
        attributes={done() ? TextAttributes.STRIKETHROUGH : active() ? TextAttributes.BOLD : undefined}
        wrapMode="word"
      >
        {props.item.content}
      </text>
      <Show when={props.item.priority === "high" || props.item.priority === "medium" || props.item.priority === "low"}>
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
  const list = createMemo(() => props.controller.list(props.sessionID))
  const done = createMemo(() => list().filter((item) => item.status === "completed").length)
  const state = createMemo(() => props.controller.state(props.sessionID))

  createEffect(() => {
    const sessionID = props.sessionID
    const deactivate = untrack(() => props.controller.activate?.(sessionID) ?? (() => {}))
    onCleanup(deactivate)
    untrack(() => void props.controller.refresh(sessionID).catch(() => {}))
  })

  return (
    <Section
      api={props.api}
      interaction={props.interaction}
      sectionId="opencode-pretty-sidebar.section.todo"
      order={props.order ?? 100}
      title="TODO"
      summary={`${done()}/${list().length}`}
      open={props.preferences.expanded().todo}
      onToggle={() => props.preferences.toggleSectionExpanded("todo")}
    >
      <SectionRequestBody
        api={props.api}
        interaction={props.interaction}
        id="opencode-pretty-sidebar.retry.todo"
        order={(props.order ?? 100) + 1}
        state={state()}
        hasItems={list().length > 0}
        empty="No tasks yet"
        loading="Loading tasks…"
        onRetry={() => void props.controller.retry(props.sessionID)}
      >
        <box gap={1}>
          <For each={list()}>{(item) => <TodoRow api={props.api} item={item} />}</For>
        </box>
      </SectionRequestBody>
    </Section>
  )
}

function SubagentRow(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  item: ReturnType<SubagentController["list"]>[number]
  order: number
  onOpen: () => void
}) {
  const theme = () => props.api.theme.current
  const retrying = () => props.item.status.type === "retry"
  const id = () => `opencode-pretty-sidebar.subagent.${props.item.session.id}`
  const row = useSidebarItem(props.api, props.interaction, {
    id: id(),
    order: () => props.order,
    activate: props.onOpen,
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
      <text flexShrink={0} fg={row.focused() ? row.foregroundColor() : retrying() ? theme().warning : theme().primary}>
        {retrying() ? "↻" : "●"}
      </text>
      <text flexGrow={1} fg={row.foregroundColor()} wrapMode="word">
        {props.item.session.title}
      </text>
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
  const list = createMemo(() => props.controller.list(props.sessionID))
  const state = createMemo(() => props.controller.state(props.sessionID))

  createEffect(() => {
    const sessionID = props.sessionID
    const deactivate = untrack(() => props.controller.activate?.(sessionID) ?? (() => {}))
    onCleanup(deactivate)
    untrack(() => void props.controller.refresh(sessionID).catch(() => {}))
  })

  return (
    <Section
      api={props.api}
      interaction={props.interaction}
      sectionId="opencode-pretty-sidebar.section.subagents"
      order={props.order ?? 200}
      title="SUBAGENTS"
      summary={`${list().length}`}
      open={props.preferences.expanded().subagents}
      onToggle={() => props.preferences.toggleSectionExpanded("subagents")}
    >
      <SectionRequestBody
        api={props.api}
        interaction={props.interaction}
        id="opencode-pretty-sidebar.retry.subagents"
        order={(props.order ?? 200) + 1}
        state={state()}
        hasItems={list().length > 0}
        empty="No active subagents"
        loading="Loading subagents…"
        onRetry={() => void props.controller.retry(props.sessionID)}
      >
        <box gap={1}>
          <For each={list()}>
            {(item, index) => (
              <SubagentRow
                api={props.api}
                interaction={props.interaction}
                item={item}
                order={(props.order ?? 200) + 10 + index()}
                onOpen={() => props.controller.open(item.session.id)}
              />
            )}
          </For>
        </box>
      </SectionRequestBody>
    </Section>
  )
}

function SkillRow(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  item: SkillInfo
  order: number
  onUse: () => void
}) {
  const theme = () => props.api.theme.current
  const id = () => `opencode-pretty-sidebar.skill.${props.item.location || props.item.name}`
  const row = useSidebarItem(props.api, props.interaction, {
    id: id(),
    order: () => props.order,
    activate: props.onUse,
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
      onMouseUp={(event) => row.activate(event)}
    >
      <text flexShrink={0} fg={row.focused() ? row.foregroundColor() : theme().accent}>
        ◆
      </text>
      <text flexGrow={1} fg={row.foregroundColor()} wrapMode="word">
        {props.item.name}
      </text>
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
  const [query, setQuery] = createSignal("")
  const target = createMemo(() => props.controller.target())
  const list = createMemo(() => props.controller.list(target()))
  const filtered = createMemo(() => list().filter((item) => matchesFilter(query(), item.name, item.description)))
  const state = createMemo(() => props.controller.state(target()))

  createEffect(() => {
    const current = target()
    const deactivate = untrack(() => props.controller.activate?.(current) ?? (() => {}))
    onCleanup(deactivate)
    untrack(() => void props.controller.refresh(current).catch(() => {}))
  })

  async function useSkill(item: SkillInfo) {
    try {
      await props.controller.use(target(), item.name)
    } catch (cause) {
      if (isAbortError(cause)) return
      props.api.ui.toast({
        variant: "error",
        title: "Skills",
        message: cause instanceof Error ? cause.message : `Failed to insert /${item.name}`,
        duration: 5000,
      })
    }
  }

  function selectSkill(item: SkillInfo) {
    if (!props.preferences.shouldConfirmSkill(item)) {
      void useSkill(item)
      return
    }
    props.api.ui.dialog.replace(() => (
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
      sectionId="opencode-pretty-sidebar.section.skills"
      order={props.order ?? 300}
      title="SKILLS"
      summary={`${list().length}`}
      open={props.preferences.expanded().skills}
      onToggle={() => props.preferences.toggleSectionExpanded("skills")}
    >
      <SectionRequestBody
        api={props.api}
        interaction={props.interaction}
        id="opencode-pretty-sidebar.retry.skills"
        order={(props.order ?? 300) + 1}
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
            id="opencode-pretty-sidebar.filter.skills"
            order={(props.order ?? 300) + 2}
            query={query()}
            placeholder="Filter skills..."
            onInput={setQuery}
          />
          <Show
            when={filtered().length > 0}
            fallback={<text fg={props.api.theme.current.textMuted}>No matching skills</text>}
          >
            <box>
              <For each={filtered()}>
                {(item, index) => (
                  <SkillRow
                    api={props.api}
                    interaction={props.interaction}
                    item={item}
                    order={(props.order ?? 300) + 10 + index()}
                    onUse={() => selectSkill(item)}
                  />
                )}
              </For>
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
  order: number
}) {
  const theme = () => props.api.theme.current
  const shortcut = createMemo(() => {
    const bindings = props.api.keymap.getCommandBindings({
      visibility: "registered",
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
      variant: "warning",
      title: props.action.label,
      message: `Command is ${result.reason}`,
      duration: 3000,
    })
  }
  const id = () => `opencode-pretty-sidebar.quick-action.${props.action.command}`
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
        {props.action.icon}
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
  return (
    <Section
      api={props.api}
      interaction={props.interaction}
      sectionId="opencode-pretty-sidebar.section.quick_actions"
      order={props.order ?? 400}
      title="QUICK ACTIONS"
      summary={`${QUICK_ACTIONS.length}`}
      open={props.preferences.expanded().quick_actions}
      onToggle={() => props.preferences.toggleSectionExpanded("quick_actions")}
    >
      <box>
        <For each={QUICK_ACTIONS}>
          {(action, index) => (
            <QuickActionRow
              api={props.api}
              interaction={props.interaction}
              action={action}
              order={(props.order ?? 400) + 10 + index()}
            />
          )}
        </For>
      </box>
    </Section>
  )
}

export function LspBadge(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  id: string
  navigationId?: string
  order?: number
  status: TuiSidebarLspItem["status"]
  iconStyle: LspIconStyle
}) {
  const known = lspIconName(props.id) !== undefined
  const [showName, setShowName] = createSignal(false)
  const statusColor = () =>
    props.status === "connected" ? props.api.theme.current.success : props.api.theme.current.error

  if (!known) {
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
      id: props.navigationId ?? `opencode-pretty-sidebar.lsp.${props.id}`,
      order: () => props.order ?? 0,
      activate: () => setShowName((value) => !value),
    },
    statusColor,
  )

  return (
    <box
      ref={(node: BoxRenderable) => item.ref(node)}
      id={props.navigationId ?? `opencode-pretty-sidebar.lsp.${props.id}`}
      flexDirection="row"
      gap={1}
      flexShrink={0}
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={item.backgroundColor()}
      onMouseOver={item.onMouseOver}
      onMouseOut={item.onMouseOut}
      onMouseDown={(event) => item.activate(event)}
    >
      <text flexShrink={0} fg={item.foregroundColor()}>
        {lspIcon(props.id, props.iconStyle)}
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
  iconStyle: LspIconStyle
  preferences: PreferencesController
  interaction?: SidebarInteraction
  order?: number
}) {
  const list = createMemo(() => props.api.state.lsp())
  const connected = createMemo(() => list().filter((item) => item.status === "connected").length)
  const disabled = createMemo(() => !props.api.state.config.lsp)

  return (
    <Section
      api={props.api}
      interaction={props.interaction}
      sectionId="opencode-pretty-sidebar.section.lsp"
      order={props.order ?? 500}
      title="LSP"
      summary={`${connected()}/${list().length}`}
      open={props.preferences.expanded().lsp}
      onToggle={() => props.preferences.toggleSectionExpanded("lsp")}
    >
      <Show
        when={list().length > 0}
        fallback={
          <text fg={props.api.theme.current.textMuted}>
            {disabled() ? "LSP is disabled" : "Activates as files are read"}
          </text>
        }
      >
        <box flexDirection="row" flexWrap="wrap" gap={1} paddingLeft={1} paddingRight={1}>
          <For each={list()}>
            {(item: TuiSidebarLspItem, index) => (
              <LspBadge
                api={props.api}
                interaction={props.interaction}
                id={item.id}
                navigationId={`opencode-pretty-sidebar.lsp.${item.id}.${item.root}`}
                order={(props.order ?? 500) + 10 + index()}
                status={item.status}
                iconStyle={props.iconStyle}
              />
            )}
          </For>
        </box>
      </Show>
    </Section>
  )
}

function mcpColor(api: TuiPluginApi, status: string) {
  const theme = api.theme.current
  if (status === "connected") return theme.success
  if (status === "failed" || status === "needs_client_registration") return theme.error
  if (status === "needs_auth") return theme.warning
  return theme.textMuted
}

function mcpToggle(status: string, busy: boolean) {
  if (busy || status === "pending") return "◍"
  return status === "connected" ? "◉" : "○"
}

function McpRow(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  item: TuiSidebarMcpItem
  order: number
  state: TargetRequestState
  disabled: boolean
  onToggle: () => void
  onRetry: () => void
}) {
  const theme = () => props.api.theme.current
  const busy = () => props.state.status === "loading" || props.state.status === "refreshing"
  const error = () => props.state.error
  const disabled = () => props.disabled || busy()
  const id = () => `opencode-pretty-sidebar.mcp.${props.item.name}`
  const row = useSidebarItem(props.api, props.interaction, {
    id: id(),
    order: () => props.order,
    disabled,
    activate: props.onToggle,
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
      onMouseOver={row.onMouseOver}
      onMouseOut={row.onMouseOut}
      onMouseDown={(event) => row.activate(event)}
    >
      <box flexDirection="row" justifyContent="space-between" gap={1}>
        <text
          fg={
            row.focused() || disabled()
              ? row.foregroundColor()
              : props.item.status === "connected"
                ? theme().text
                : theme().textMuted
          }
          wrapMode="none"
        >
          {props.item.name}
        </text>
        <text flexShrink={0} fg={row.focused() ? row.foregroundColor() : mcpColor(props.api, props.item.status)}>
          <b>{mcpToggle(props.item.status, busy())}</b>
        </text>
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
        order={props.order + 0.5}
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
  order: number
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
  const [query, setQuery] = createSignal("")
  const target = createMemo(() => props.controller.target())
  const list = createMemo(() => props.controller.list(target()))
  const filtered = createMemo(() => list().filter((item) => matchesFilter(query(), item.name)))
  const active = createMemo(() => list().filter((item) => item.status === "connected").length)
  const state = createMemo(() => props.controller.state(target()))
  const bulk = createMemo(
    () =>
      props.controller.bulkState?.(target()) ?? {
        action: "connect" as const,
        status: "idle" as const,
        completed: 0,
        total: 0,
        failed: [],
      },
  )
  const bulkRunning = createMemo(() => bulk().status === "running")
  const connectable = createMemo(() => list().filter((item) => mcpToggleAction(item.status) === "connect").length)
  const disconnectable = createMemo(() => list().filter((item) => mcpToggleAction(item.status) === "disconnect").length)
  const errors = createMemo(
    () =>
      list().filter(
        (item) =>
          item.status === "failed" || item.status === "needs_auth" || item.status === "needs_client_registration",
      ).length,
  )
  const summary = createMemo(() => `${active()}/${list().length}${errors() ? ` · ${errors()}!` : ""}`)

  async function toggle(name: string) {
    await props.controller.toggle(name).catch(() => {})
  }

  return (
    <Section
      api={props.api}
      interaction={props.interaction}
      sectionId="opencode-pretty-sidebar.section.mcp"
      order={props.order ?? 600}
      title="MCP"
      summary={summary()}
      open={props.preferences.expanded().mcp}
      onToggle={() => props.preferences.toggleSectionExpanded("mcp")}
    >
      <SectionRequestBody
        api={props.api}
        interaction={props.interaction}
        id="opencode-pretty-sidebar.retry.mcp"
        order={(props.order ?? 600) + 1}
        state={state()}
        hasItems={list().length > 0}
        empty="No MCP servers"
        loading="Loading MCP servers…"
        onRetry={() => void props.controller.retry(target())}
      >
        <box>
          <box flexDirection="row" gap={1} paddingBottom={bulkRunning() || bulk().status === "error" ? 1 : 0}>
            <McpBulkAction
              api={props.api}
              interaction={props.interaction}
              id="opencode-pretty-sidebar.mcp.connect-all"
              order={(props.order ?? 600) + 2}
              label="Connect all"
              disabled={bulkRunning() || connectable() === 0}
              onActivate={() => void props.controller.connectAll(target())}
            />
            <McpBulkAction
              api={props.api}
              interaction={props.interaction}
              id="opencode-pretty-sidebar.mcp.disconnect-all"
              order={(props.order ?? 600) + 3}
              label="Disconnect all"
              disabled={bulkRunning() || disconnectable() === 0}
              onActivate={() => void props.controller.disconnectAll(target())}
            />
          </box>
          <Show when={bulkRunning()}>
            <text fg={props.api.theme.current.textMuted}>
              {bulk().action === "connect" ? "Connecting" : "Disconnecting"} {bulk().completed}/{bulk().total}…
            </text>
          </Show>
          <Show when={bulk().status === "error"}>
            <McpBulkAction
              api={props.api}
              interaction={props.interaction}
              id="opencode-pretty-sidebar.mcp.retry-all"
              order={(props.order ?? 600) + 4}
              label={`Retry ${bulk().failed.length} failed`}
              disabled={false}
              onActivate={() => void props.controller.retryBulk(target())}
            />
          </Show>
          <SectionFilter
            api={props.api}
            interaction={props.interaction}
            id="opencode-pretty-sidebar.filter.mcp"
            order={(props.order ?? 600) + 5}
            query={query()}
            placeholder="Filter MCP..."
            onInput={setQuery}
          />
          <Show
            when={filtered().length > 0}
            fallback={<text fg={props.api.theme.current.textMuted}>No matching MCP servers</text>}
          >
            <box>
              <For each={filtered()}>
                {(item, index) => (
                  <McpRow
                    api={props.api}
                    interaction={props.interaction}
                    item={item}
                    order={(props.order ?? 600) + 10 + index() * 2}
                    state={props.controller.serverState(item.name, target())}
                    disabled={bulkRunning()}
                    onToggle={() => void toggle(item.name)}
                    onRetry={() => void props.controller.retryServer(item.name, target())?.catch(() => {})}
                  />
                )}
              </For>
            </box>
          </Show>
        </box>
      </SectionRequestBody>
    </Section>
  )
}
