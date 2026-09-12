/** @jsxImportSource @opentui/solid */
import type {
  TuiPlugin,
  TuiPluginApi,
  TuiPluginModule,
  TuiSidebarMcpItem,
  TuiSidebarTodoItem,
} from "@opencode-ai/plugin/tui"
import type { Session, SessionStatus } from "@opencode-ai/sdk/v2"
import { TextAttributes } from "@opentui/core"
import { batch, createEffect, createMemo, createSignal, For, Show } from "solid-js"
import {
  MCP_PREFERENCES_KEY,
  disabledMcpNames,
  mcpScope,
  mcpToggleAction,
  parseSectionVisibility,
  setMcpDisabled,
  type SectionVisibility,
} from "./state"

const PLUGIN_ID = "opencode-pretty-sidebar"
const TOGGLE_COMMAND = `${PLUGIN_ID}.toggle`
const TODO_OPEN_KEY = `${PLUGIN_ID}.todo-open`
const SUBAGENTS_OPEN_KEY = `${PLUGIN_ID}.subagents-open`
const SKILLS_OPEN_KEY = `${PLUGIN_ID}.skills-open`
const ACTIONS_OPEN_KEY = `${PLUGIN_ID}.actions-open`
const MCP_OPEN_KEY = `${PLUGIN_ID}.mcp-open`

export const QUICK_ACTIONS = [
  { icon: "✎", label: "Rename", command: "session.rename" },
  { icon: "≡", label: "Timeline", command: "session.timeline" },
  { icon: "⧉", label: "Copy transcript", command: "session.copy" },
  { icon: "⇧", label: "Export", command: "session.export" },
  { icon: "◫", label: "Compact", command: "session.compact" },
] as const

type PluginConfig = {
  toggleKey: string
  persistMcp: boolean
  sections: SectionVisibility
}

type McpController = ReturnType<typeof createMcpController>
type TodoController = ReturnType<typeof createTodoController>
type SubagentController = ReturnType<typeof createSubagentController>
type SkillController = ReturnType<typeof createSkillController>
type SidebarTodo = TuiSidebarTodoItem & { priority?: string }
type SkillInfo = { name: string; description?: string; location: string; content: string }
type McpTarget = {
  key: string
  scope: string
  routing: { directory: string; workspace?: string }
}
type SessionMutation = { type: "upsert"; info: Session } | { type: "remove"; sessionID: string }
type StatusMutation = { sessionID: string; status: SessionStatus }

function currentLocation(api: TuiPluginApi) {
  const route = api.route.current
  const params = "params" in route ? route.params : undefined
  const sessionID = typeof params?.sessionID === "string" ? params.sessionID : undefined
  const session = sessionID ? api.state.session.get(sessionID) : undefined
  const directory = session?.directory ?? api.state.path.directory
  const workspace = session?.workspaceID
  return {
    key: JSON.stringify([directory, workspace ?? null]),
    routing: { directory, ...(workspace ? { workspace } : {}) },
  }
}

function pluginConfig(options: Record<string, unknown> | undefined): PluginConfig {
  return {
    toggleKey:
      typeof options?.toggle_key === "string" && options.toggle_key.trim()
        ? options.toggle_key.trim()
        : "ctrl+shift+b",
    persistMcp: options?.persist_mcp !== false,
    sections: parseSectionVisibility(options?.sections),
  }
}

function statusError(status: unknown) {
  if (!status || typeof status !== "object" || !("error" in status)) return
  const error = (status as { error?: unknown }).error
  return typeof error === "string" ? error : undefined
}

export function createMcpController(api: TuiPluginApi, persist: boolean) {
  const [snapshot, setSnapshot] = createSignal<{ target: string; items: ReadonlyArray<TuiSidebarMcpItem> }>()
  const refreshing = new Map<string, Promise<ReadonlyArray<TuiSidebarMcpItem>>>()
  const mutations = new Map<string, Promise<void>>()
  let activation = 0

  function target(): McpTarget {
    const location = currentLocation(api)
    return {
      key: location.key,
      scope: mcpScope(api.state.path),
      routing: location.routing,
    }
  }

  function list(current = target()) {
    const value = snapshot()
    return value?.target === current.key ? value.items : api.state.mcp()
  }

  async function refresh(current = target(), force = false): Promise<ReadonlyArray<TuiSidebarMcpItem>> {
    const pending = refreshing.get(current.key)
    if (pending) {
      if (!force) return pending
      await pending.catch(() => {})
    }

    const request = api.client.mcp
      .status(current.routing, { throwOnError: true })
      .then((result) => {
        const items = Object.entries(result.data ?? {})
          .map(([name, status]) => ({ name, status: status.status, error: statusError(status) }))
          .sort((a, b) => a.name.localeCompare(b.name))
        if (target().key === current.key) setSnapshot({ target: current.key, items })
        return items
      })
      .finally(() => {
        if (refreshing.get(current.key) === request) refreshing.delete(current.key)
      })
    refreshing.set(current.key, request)
    return request
  }

  async function mutate(current: McpTarget, name: string, operation: () => Promise<unknown>) {
    const key = JSON.stringify([current.key, name])
    const previous = mutations.get(key) ?? Promise.resolve()
    const request = previous.catch(() => {}).then(operation).then(() => undefined)
    mutations.set(key, request)
    try {
      await request
    } finally {
      if (mutations.get(key) === request) mutations.delete(key)
    }
  }

  function save(current: McpTarget, name: string, disabled: boolean) {
    if (!persist) return
    const value = setMcpDisabled(api.kv.get(MCP_PREFERENCES_KEY), current.scope, name, disabled)
    api.kv.set(MCP_PREFERENCES_KEY, value)
  }

  async function toggle(name: string) {
    const current = target()
    const item = list(current).find((candidate) => candidate.name === name)
    const action = item && mcpToggleAction(item.status)
    if (!action) return

    activation += 1
    save(current, name, action === "disconnect")
    await mutate(current, name, () =>
      action === "disconnect"
        ? api.client.mcp.disconnect({ name, ...current.routing }, { throwOnError: true })
        : api.client.mcp.connect({ name, ...current.routing }, { throwOnError: true }),
    )
    await refresh(current, true)
  }

  async function activate(current = target()) {
    const generation = ++activation
    const items = await refresh(current, true)
    if (!persist || generation !== activation || target().key !== current.key) return

    const connected = items.filter((item) => item.status === "connected")
    const results = await Promise.allSettled(
      connected.map((item) =>
        mutate(current, item.name, async () => {
          if (generation !== activation || target().key !== current.key) return
          const disabled = disabledMcpNames(api.kv.get(MCP_PREFERENCES_KEY), current.scope)
          if (!disabled.has(item.name)) return
          await api.client.mcp.disconnect({ name: item.name, ...current.routing }, { throwOnError: true })
        }),
      ),
    )
    if (results.some((result) => result.status === "rejected")) {
      api.ui.toast({
        variant: "warning",
        title: "MCP preferences",
        message: "Some saved MCP preferences could not be restored",
        duration: 4000,
      })
    }
    if (generation === activation && target().key === current.key) await refresh(current, true)
  }

  return { list, refresh, activate, target, toggle }
}

export function createTodoController(api: TuiPluginApi) {
  const [sessions, setSessions] = createSignal<Record<string, ReadonlyArray<SidebarTodo>>>({})
  const refreshing = new Map<string, Promise<ReadonlyArray<SidebarTodo>>>()
  const revisions = new Map<string, number>()

  function set(sessionID: string, todos: ReadonlyArray<SidebarTodo>) {
    setSessions((current) => ({ ...current, [sessionID]: todos }))
  }

  function list(sessionID: string) {
    return sessions()[sessionID] ?? api.state.session.todo(sessionID)
  }

  async function refresh(sessionID: string) {
    const pending = refreshing.get(sessionID)
    if (pending) return pending

    const revision = revisions.get(sessionID) ?? 0
    const request = api.client.session
      .todo({ sessionID }, { throwOnError: true })
      .then((result) => {
        const todos = result.data ?? []
        if ((revisions.get(sessionID) ?? 0) === revision) set(sessionID, todos)
        return todos
      })
      .finally(() => refreshing.delete(sessionID))
    refreshing.set(sessionID, request)
    return request
  }

  const unsubscribe = api.event.on("todo.updated", (event) => {
    const sessionID = event.properties.sessionID
    revisions.set(sessionID, (revisions.get(sessionID) ?? 0) + 1)
    set(sessionID, event.properties.todos)
  })
  api.lifecycle.onDispose(unsubscribe)

  return { list, refresh }
}

function activeStatus(status: SessionStatus | undefined): status is Extract<SessionStatus, { type: "busy" | "retry" }> {
  return status?.type === "busy" || status?.type === "retry"
}

export function createSubagentController(api: TuiPluginApi) {
  const [children, setChildren] = createSignal<Record<string, ReadonlyArray<Session>>>({})
  const [statuses, setStatuses] = createSignal<Record<string, SessionStatus>>({})
  const refreshing = new Map<string, Promise<void>>()
  const journals = new Set<{ sessions: SessionMutation[]; statuses: StatusMutation[] }>()

  function applySession(items: ReadonlyArray<Session>, parentID: string, mutation: SessionMutation) {
    const next = items.filter((item) => item.id !== (mutation.type === "upsert" ? mutation.info.id : mutation.sessionID))
    if (mutation.type === "upsert" && mutation.info.parentID === parentID) next.push(mutation.info)
    return next.sort((a, b) => a.time.created - b.time.created || a.id.localeCompare(b.id))
  }

  function applyStatus(current: Record<string, SessionStatus>, mutation: StatusMutation) {
    const next = { ...current }
    if (mutation.status.type === "idle") delete next[mutation.sessionID]
    else next[mutation.sessionID] = mutation.status
    return next
  }

  function recordSession(mutation: SessionMutation) {
    for (const journal of journals) journal.sessions.push(mutation)
    setChildren((current) =>
      Object.fromEntries(
        Object.entries(current).map(([parentID, items]) => [parentID, applySession(items, parentID, mutation)]),
      ),
    )
  }

  function recordStatus(mutation: StatusMutation) {
    for (const journal of journals) journal.statuses.push(mutation)
    setStatuses((current) => applyStatus(current, mutation))
  }

  async function refresh(parentID: string) {
    const pending = refreshing.get(parentID)
    if (pending) return pending

    const journal = { sessions: [] as SessionMutation[], statuses: [] as StatusMutation[] }
    journals.add(journal)
    const parent = api.state.session.get(parentID)
    const routing = {
      directory: parent?.directory ?? api.state.path.directory,
      ...(parent?.workspaceID ? { workspace: parent.workspaceID } : {}),
    }
    const request = Promise.all([
      api.client.session.children({ sessionID: parentID, ...routing }, { throwOnError: true }),
      api.client.session.status(routing, { throwOnError: true }),
    ])
      .then(([childResult, statusResult]) => {
        let nextChildren: ReadonlyArray<Session> = childResult.data ?? []
        for (const mutation of journal.sessions) nextChildren = applySession(nextChildren, parentID, mutation)

        let nextStatuses = { ...(statusResult.data ?? {}) }
        for (const mutation of journal.statuses) nextStatuses = applyStatus(nextStatuses, mutation)

        batch(() => {
          setChildren((current) => ({ ...current, [parentID]: nextChildren }))
          setStatuses(nextStatuses)
        })
      })
      .finally(() => {
        journals.delete(journal)
        refreshing.delete(parentID)
      })
    refreshing.set(parentID, request)
    return request
  }

  function list(parentID: string) {
    const currentStatuses = statuses()
    return (children()[parentID] ?? [])
      .map((session) => ({ session, status: currentStatuses[session.id] ?? api.state.session.status(session.id) }))
      .filter((item): item is { session: Session; status: Extract<SessionStatus, { type: "busy" | "retry" }> } =>
        activeStatus(item.status),
      )
  }

  const unsubscribe = [
    api.event.on("session.created", (event) => recordSession({ type: "upsert", info: event.properties.info })),
    api.event.on("session.updated", (event) => recordSession({ type: "upsert", info: event.properties.info })),
    api.event.on("session.deleted", (event) => {
      recordSession({ type: "remove", sessionID: event.properties.sessionID })
      recordStatus({ sessionID: event.properties.sessionID, status: { type: "idle" } })
    }),
    api.event.on("session.status", (event) => recordStatus(event.properties)),
    api.event.on("session.idle", (event) =>
      recordStatus({ sessionID: event.properties.sessionID, status: { type: "idle" } }),
    ),
    api.event.on("server.connected", () => {
      for (const parentID of Object.keys(children())) void refresh(parentID).catch(() => {})
    }),
  ]
  api.lifecycle.onDispose(() => unsubscribe.forEach((dispose) => dispose()))

  return {
    list,
    refresh,
    open(sessionID: string) {
      api.route.navigate("session", { sessionID })
    },
  }
}

export function createSkillController(api: TuiPluginApi) {
  const [skills, setSkills] = createSignal<Record<string, ReadonlyArray<SkillInfo>>>({})
  const [errors, setErrors] = createSignal<Record<string, string | undefined>>({})
  const refreshing = new Map<string, Promise<ReadonlyArray<SkillInfo>>>()
  const targets = new Map<string, ReturnType<typeof currentLocation>>()

  function target() {
    return currentLocation(api)
  }

  function list(current = target()) {
    return skills()[current.key] ?? []
  }

  function error(current = target()) {
    return errors()[current.key]
  }

  async function refresh(current = target()) {
    const pending = refreshing.get(current.key)
    if (pending) return pending
    targets.set(current.key, current)

    const request = api.client.app
      .skills(current.routing, { throwOnError: true })
      .then((result) => {
        const items = [...(result.data ?? [])].sort((a, b) => a.name.localeCompare(b.name))
        setSkills((value) => ({ ...value, [current.key]: items }))
        setErrors((value) => ({ ...value, [current.key]: undefined }))
        return items
      })
      .catch((cause) => {
        setErrors((value) => ({
          ...value,
          [current.key]: cause instanceof Error ? cause.message : "Failed to load skills",
        }))
        throw cause
      })
      .finally(() => refreshing.delete(current.key))
    refreshing.set(current.key, request)
    return request
  }

  const unsubscribe = api.event.on("server.connected", () => {
    for (const current of targets.values()) void refresh(current).catch(() => {})
  })
  api.lifecycle.onDispose(unsubscribe)

  return {
    list,
    error,
    refresh,
    target,
    use(current: ReturnType<typeof currentLocation>, name: string) {
      return api.client.tui.appendPrompt({ ...current.routing, text: `/${name} ` }, { throwOnError: true })
    },
  }
}

function SidebarTitle(props: { api: TuiPluginApi; sessionID: string; title: string }) {
  const theme = () => props.api.theme.current
  const status = createMemo(() => props.api.state.session.status(props.sessionID)?.type)

  return (
    <box border={["bottom"]} borderColor={theme().borderSubtle} paddingBottom={1} paddingRight={1}>
      <box flexDirection="row" gap={1}>
        <text flexShrink={0} fg={status() === "busy" ? theme().primary : theme().accent}>
          {status() === "busy" ? "●" : "◆"}
        </text>
        <text fg={theme().text} wrapMode="word">
          <b>{props.title}</b>
        </text>
      </box>
    </box>
  )
}

function Section(props: {
  api: TuiPluginApi
  title: string
  summary: string
  open: boolean
  onToggle: () => void
  children: import("solid-js").JSX.Element
}) {
  const theme = () => props.api.theme.current

  return (
    <box
      paddingTop={1}
      paddingBottom={1}
      paddingLeft={1}
      paddingRight={1}
      gap={1}
    >
      <box flexDirection="row" justifyContent="space-between" gap={1} onMouseUp={props.onToggle}>
        <text fg={theme().text}>
          <span style={{ fg: theme().accent }}>{props.open ? "▾" : "▸"}</span> <b>{props.title}</b>
        </text>
        <box flexDirection="row" gap={1} flexShrink={0}>
          <text fg={theme().textMuted}>{props.summary}</text>
        </box>
      </box>
      <Show when={props.open}>{props.children}</Show>
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

function TodoSection(props: { api: TuiPluginApi; controller: TodoController; sessionID: string }) {
  const initial = props.api.kv.get(TODO_OPEN_KEY, true)
  const [open, setOpen] = createSignal(typeof initial === "boolean" ? initial : true)
  const list = createMemo(() => props.controller.list(props.sessionID))
  const done = createMemo(() => list().filter((item) => item.status === "completed").length)

  createEffect(() => {
    void props.controller.refresh(props.sessionID).catch(() => {})
  })

  function toggle() {
    setOpen((value) => {
      props.api.kv.set(TODO_OPEN_KEY, !value)
      return !value
    })
  }

  return (
    <Section api={props.api} title="TODO" summary={`${done()}/${list().length}`} open={open()} onToggle={toggle}>
      <Show when={list().length > 0} fallback={<text fg={props.api.theme.current.textMuted}>No tasks yet</text>}>
        <box gap={1}>
          <For each={list()}>{(item) => <TodoRow api={props.api} item={item} />}</For>
        </box>
      </Show>
    </Section>
  )
}

function SubagentRow(props: {
  api: TuiPluginApi
  item: ReturnType<SubagentController["list"]>[number]
  onOpen: () => void
}) {
  const [hover, setHover] = createSignal(false)
  const theme = () => props.api.theme.current
  const retrying = () => props.item.status.type === "retry"

  return (
    <box
      flexDirection="row"
      gap={1}
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={hover() ? theme().backgroundElement : theme().backgroundPanel}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      onMouseUp={props.onOpen}
    >
      <text flexShrink={0} fg={retrying() ? theme().warning : theme().primary}>
        {retrying() ? "↻" : "●"}
      </text>
      <text flexGrow={1} fg={theme().text} wrapMode="word">
        {props.item.session.title}
      </text>
    </box>
  )
}

function SubagentSection(props: { api: TuiPluginApi; controller: SubagentController; sessionID: string }) {
  const initial = props.api.kv.get(SUBAGENTS_OPEN_KEY, false)
  const [open, setOpen] = createSignal(typeof initial === "boolean" ? initial : false)
  const list = createMemo(() => props.controller.list(props.sessionID))

  createEffect(() => {
    void props.controller.refresh(props.sessionID).catch(() => {})
  })

  function toggle() {
    setOpen((value) => {
      props.api.kv.set(SUBAGENTS_OPEN_KEY, !value)
      return !value
    })
  }

  return (
    <Show when={list().length > 0}>
      <Section api={props.api} title="SUBAGENTS" summary={`${list().length}`} open={open()} onToggle={toggle}>
        <box gap={1}>
          <For each={list()}>
            {(item) => (
              <SubagentRow
                api={props.api}
                item={item}
                onOpen={() => props.controller.open(item.session.id)}
              />
            )}
          </For>
        </box>
      </Section>
    </Show>
  )
}

function SkillRow(props: {
  api: TuiPluginApi
  item: SkillInfo
  onUse: () => void
}) {
  const [hover, setHover] = createSignal(false)
  const theme = () => props.api.theme.current
  const description = () => props.item.description?.replace(/\s+/g, " ").trim()

  return (
    <box
      flexDirection="row"
      gap={1}
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={hover() ? theme().backgroundElement : theme().backgroundPanel}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      onMouseUp={props.onUse}
    >
      <text flexShrink={0} fg={theme().accent}>
        ◆
      </text>
      <box flexGrow={1}>
        <text fg={theme().text} wrapMode="word">
          {props.item.name}
        </text>
        <Show when={description()}>
          {(value) => (
            <text fg={theme().textMuted} wrapMode="word">
              {value()}
            </text>
          )}
        </Show>
      </box>
    </box>
  )
}

function SkillsSection(props: { api: TuiPluginApi; controller: SkillController }) {
  const initial = props.api.kv.get(SKILLS_OPEN_KEY, false)
  const [open, setOpen] = createSignal(typeof initial === "boolean" ? initial : false)
  const target = createMemo(() => props.controller.target())
  const list = createMemo(() => props.controller.list(target()))
  const error = createMemo(() => props.controller.error(target()))

  createEffect(() => {
    void props.controller.refresh(target()).catch(() => {})
  })

  function toggle() {
    setOpen((value) => {
      props.api.kv.set(SKILLS_OPEN_KEY, !value)
      return !value
    })
  }

  async function useSkill(name: string) {
    try {
      await props.controller.use(target(), name)
    } catch (cause) {
      props.api.ui.toast({
        variant: "error",
        title: "Skills",
        message: cause instanceof Error ? cause.message : `Failed to insert /${name}`,
        duration: 5000,
      })
    }
  }

  return (
    <Section api={props.api} title="SKILLS" summary={`${list().length}`} open={open()} onToggle={toggle}>
      <Show
        when={!error()}
        fallback={<text fg={props.api.theme.current.error}>{error()}</text>}
      >
        <Show when={list().length > 0} fallback={<text fg={props.api.theme.current.textMuted}>No skills</text>}>
          <box gap={1}>
            <For each={list()}>
              {(item) => <SkillRow api={props.api} item={item} onUse={() => void useSkill(item.name)} />}
            </For>
          </box>
        </Show>
      </Show>
    </Section>
  )
}

function QuickActionRow(props: {
  api: TuiPluginApi
  action: (typeof QUICK_ACTIONS)[number]
}) {
  const [hover, setHover] = createSignal(false)
  const theme = () => props.api.theme.current
  const shortcut = createMemo(() => {
    const bindings = props.api.keymap.getCommandBindings({
      visibility: "registered",
      commands: [props.action.command],
    })
    return props.api.keys.formatBindings(bindings.get(props.action.command))
  })

  function run() {
    const result = props.api.keymap.dispatchCommand(props.action.command)
    if (result.ok) return
    props.api.ui.toast({
      variant: "warning",
      title: props.action.label,
      message: `Command is ${result.reason}`,
      duration: 3000,
    })
  }

  return (
    <box
      flexDirection="row"
      gap={1}
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={hover() ? theme().backgroundElement : theme().backgroundPanel}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      onMouseUp={run}
    >
      <text flexShrink={0} fg={theme().accent}>
        {props.action.icon}
      </text>
      <text flexGrow={1} fg={theme().text}>
        {props.action.label}
      </text>
      <Show when={shortcut()}>
        {(value) => (
          <text flexShrink={0} fg={theme().textMuted} wrapMode="none">
            {value()}
          </text>
        )}
      </Show>
    </box>
  )
}

function QuickActionsSection(props: { api: TuiPluginApi }) {
  const initial = props.api.kv.get(ACTIONS_OPEN_KEY, false)
  const [open, setOpen] = createSignal(typeof initial === "boolean" ? initial : false)

  function toggle() {
    setOpen((value) => {
      props.api.kv.set(ACTIONS_OPEN_KEY, !value)
      return !value
    })
  }

  return (
    <Section api={props.api} title="QUICK ACTIONS" summary={`${QUICK_ACTIONS.length}`} open={open()} onToggle={toggle}>
      <box gap={1}>
        <For each={QUICK_ACTIONS}>{(action) => <QuickActionRow api={props.api} action={action} />}</For>
      </box>
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
  item: TuiSidebarMcpItem
  busy: boolean
  disabled: boolean
  onToggle: () => void
}) {
  const [hover, setHover] = createSignal(false)
  const theme = () => props.api.theme.current

  return (
    <box
      backgroundColor={hover() && !props.disabled ? theme().backgroundElement : theme().backgroundPanel}
      paddingLeft={1}
      paddingRight={1}
      paddingTop={props.item.error ? 1 : 0}
      paddingBottom={props.item.error ? 1 : 0}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      onMouseUp={() => !props.disabled && props.onToggle()}
    >
      <box flexDirection="row" justifyContent="space-between" gap={1}>
        <text fg={props.item.status === "connected" ? theme().text : theme().textMuted} wrapMode="none">
          {props.item.name}
        </text>
        <text flexShrink={0} fg={mcpColor(props.api, props.item.status)}>
          <b>{mcpToggle(props.item.status, props.busy)}</b>
        </text>
      </box>
      <Show when={props.item.error}>
        <text fg={theme().error} wrapMode="word">
          {props.item.error}
        </text>
      </Show>
    </box>
  )
}

function McpSection(props: { api: TuiPluginApi; controller: McpController }) {
  const initial = props.api.kv.get(MCP_OPEN_KEY, false)
  const [open, setOpen] = createSignal(typeof initial === "boolean" ? initial : false)
  const [loading, setLoading] = createSignal<string>()
  const list = props.controller.list
  const active = createMemo(() => list().filter((item) => item.status === "connected").length)
  const errors = createMemo(
    () =>
      list().filter(
        (item) => item.status === "failed" || item.status === "needs_auth" || item.status === "needs_client_registration",
      ).length,
  )
  const summary = createMemo(() => `${active()}/${list().length}${errors() ? ` · ${errors()}!` : ""}`)

  function toggleOpen() {
    setOpen((value) => {
      props.api.kv.set(MCP_OPEN_KEY, !value)
      return !value
    })
  }

  async function toggle(name: string) {
    if (loading()) return
    setLoading(name)
    try {
      await props.controller.toggle(name)
    } catch (error) {
      props.api.ui.toast({
        variant: "error",
        title: "MCP",
        message: error instanceof Error ? error.message : `Failed to toggle ${name}`,
        duration: 5000,
      })
    } finally {
      setLoading(undefined)
    }
  }

  return (
    <Section api={props.api} title="MCP" summary={summary()} open={open()} onToggle={toggleOpen}>
      <Show when={list().length > 0} fallback={<text fg={props.api.theme.current.textMuted}>No MCP servers</text>}>
        <box>
          <For each={list()}>
            {(item) => (
              <McpRow
                api={props.api}
                item={item}
                busy={loading() === item.name}
                disabled={loading() !== undefined}
                onToggle={() => void toggle(item.name)}
              />
            )}
          </For>
        </box>
      </Show>
    </Section>
  )
}

function SidebarContent(props: {
  api: TuiPluginApi
  mcp: McpController
  todo: TodoController
  subagents: SubagentController
  skills: SkillController
  sections: SectionVisibility
  sessionID: string
}) {
  return (
    <box gap={1}>
      <Show when={props.sections.todo}>
        <TodoSection api={props.api} controller={props.todo} sessionID={props.sessionID} />
      </Show>
      <Show when={props.sections.subagents}>
        <SubagentSection api={props.api} controller={props.subagents} sessionID={props.sessionID} />
      </Show>
      <Show when={props.sections.skills}>
        <SkillsSection api={props.api} controller={props.skills} />
      </Show>
      <Show when={props.sections.quick_actions}>
        <QuickActionsSection api={props.api} />
      </Show>
      <Show when={props.sections.mcp}>
        <McpSection api={props.api} controller={props.mcp} />
      </Show>
    </box>
  )
}

function McpPersistence(props: { api: TuiPluginApi; controller: McpController }) {
  createEffect(() => {
    if (!props.api.state.ready || !props.api.kv.ready) return
    const route = props.api.route.current
    const params = "params" in route ? route.params : undefined
    if (typeof params?.sessionID !== "string") return
    const current = props.controller.target()
    void props.controller.activate(current).catch(() => {})
  })
  return <></>
}

const tui: TuiPlugin = async (api, options) => {
  const config = pluginConfig(options)
  const mcp = createMcpController(api, config.persistMcp)
  const todo = createTodoController(api)
  const subagents = createSubagentController(api)
  const skills = createSkillController(api)

  api.keymap.registerLayer({
    mode: "base",
    commands: [
      {
        name: TOGGLE_COMMAND,
        title: "Toggle sidebar",
        category: "Sidebar",
        namespace: "palette",
        enabled: () => api.route.current.name === "session",
        run() {
          api.keymap.dispatchCommand("session.sidebar.toggle")
        },
      },
    ],
    bindings: [{ key: config.toggleKey, cmd: TOGGLE_COMMAND, desc: "Toggle sidebar" }],
  })

  const unsubscribeMcp = api.event.on("mcp.tools.changed", () => {
    void mcp.refresh().catch(() => {})
  })
  const unsubscribeConnected = api.event.on("server.connected", () => {
    if (!api.state.ready || !api.kv.ready) return
    void mcp.activate().catch(() => {})
  })
  api.lifecycle.onDispose(unsubscribeMcp)
  api.lifecycle.onDispose(unsubscribeConnected)

  api.slots.register({
    order: 100,
    slots: {
      app() {
        return <McpPersistence api={api} controller={mcp} />
      },
      sidebar_title(_ctx, props) {
        return <SidebarTitle api={api} sessionID={props.session_id} title={props.title} />
      },
      sidebar_content(_ctx, props) {
        return (
          <SidebarContent
            api={api}
            mcp={mcp}
            todo={todo}
            subagents={subagents}
            skills={skills}
            sections={config.sections}
            sessionID={props.session_id}
          />
        )
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id: PLUGIN_ID,
  tui,
}

export default plugin
