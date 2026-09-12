/** @jsxImportSource @opentui/solid */
import type {
  TuiPlugin,
  TuiPluginApi,
  TuiPluginModule,
  TuiSidebarMcpItem,
  TuiSidebarTodoItem,
} from "@opencode-ai/plugin/tui"
import { TextAttributes } from "@opentui/core"
import { createEffect, createMemo, createSignal, For, Show } from "solid-js"
import {
  MCP_PREFERENCES_KEY,
  disabledMcpNames,
  mcpScope,
  mcpToggleAction,
  setMcpDisabled,
} from "./state"

const PLUGIN_ID = "opencode-pretty-sidebar"
const TOGGLE_COMMAND = `${PLUGIN_ID}.toggle`
const TODO_OPEN_KEY = `${PLUGIN_ID}.todo-open`
const MCP_OPEN_KEY = `${PLUGIN_ID}.mcp-open`

type PluginConfig = {
  toggleKey: string
  persistMcp: boolean
}

type McpController = ReturnType<typeof createMcpController>
type TodoController = ReturnType<typeof createTodoController>
type SidebarTodo = TuiSidebarTodoItem & { priority?: string }

function pluginConfig(options: Record<string, unknown> | undefined): PluginConfig {
  return {
    toggleKey:
      typeof options?.toggle_key === "string" && options.toggle_key.trim()
        ? options.toggle_key.trim()
        : "ctrl+shift+b",
    persistMcp: options?.persist_mcp !== false,
  }
}

function statusError(status: unknown) {
  if (!status || typeof status !== "object" || !("error" in status)) return
  const error = (status as { error?: unknown }).error
  return typeof error === "string" ? error : undefined
}

function createMcpController(api: TuiPluginApi, persist: boolean) {
  const [snapshot, setSnapshot] = createSignal<ReadonlyArray<TuiSidebarMcpItem>>()
  let refreshing: Promise<ReadonlyArray<TuiSidebarMcpItem>> | undefined
  let restoring = false

  const list = createMemo(() => snapshot() ?? api.state.mcp())

  async function refresh() {
    if (refreshing) return refreshing
    refreshing = api.client.mcp
      .status(undefined, { throwOnError: true })
      .then((result) => {
        const items = Object.entries(result.data ?? {})
          .map(([name, status]) => ({
            name,
            status: status.status,
            error: statusError(status),
          }))
          .sort((a, b) => a.name.localeCompare(b.name))
        setSnapshot(items)
        return items
      })
      .finally(() => {
        refreshing = undefined
      })
    return refreshing
  }

  function save(name: string, disabled: boolean) {
    if (!persist) return
    const scope = mcpScope(api.state.path)
    const value = setMcpDisabled(api.kv.get(MCP_PREFERENCES_KEY), scope, name, disabled)
    api.kv.set(MCP_PREFERENCES_KEY, value)
  }

  async function toggle(name: string) {
    const item = list().find((candidate) => candidate.name === name)
    const action = item && mcpToggleAction(item.status)
    if (!action) return

    if (action === "disconnect") {
      await api.client.mcp.disconnect({ name }, { throwOnError: true })
      save(name, true)
    } else {
      await api.client.mcp.connect({ name }, { throwOnError: true })
      save(name, false)
    }
    await refresh()
  }

  async function restore() {
    if (!persist || restoring || !api.state.ready || !api.kv.ready) return
    restoring = true
    try {
      const scope = mcpScope(api.state.path)
      const disabled = disabledMcpNames(api.kv.get(MCP_PREFERENCES_KEY), scope)
      if (disabled.size === 0) return

      const items = await refresh()
      const connected = items.filter((item) => item.status === "connected" && disabled.has(item.name))
      if (connected.length === 0) return

      const results = await Promise.allSettled(
        connected.map((item) => api.client.mcp.disconnect({ name: item.name }, { throwOnError: true })),
      )
      if (results.some((result) => result.status === "rejected")) {
        api.ui.toast({
          variant: "warning",
          title: "MCP preferences",
          message: "Some saved MCP preferences could not be restored",
          duration: 4000,
        })
      }
      await refresh()
    } finally {
      restoring = false
    }
  }

  return { list, refresh, restore, toggle }
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
    if (props.item.priority === "high") return "H"
    if (props.item.priority === "medium") return "M"
    if (props.item.priority === "low") return "L"
    return "?"
  }
  const priorityColor = () => {
    if (props.item.priority === "high") return theme().error
    if (props.item.priority === "medium") return theme().warning
    return theme().textMuted
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
  const initial = props.api.kv.get(MCP_OPEN_KEY, true)
  const [open, setOpen] = createSignal(typeof initial === "boolean" ? initial : true)
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
  sessionID: string
}) {
  return (
    <box gap={1}>
      <TodoSection api={props.api} controller={props.todo} sessionID={props.sessionID} />
      <McpSection api={props.api} controller={props.mcp} />
    </box>
  )
}

function McpPersistence(props: { api: TuiPluginApi; controller: McpController }) {
  createEffect(() => {
    if (!props.api.state.ready || !props.api.kv.ready) return
    mcpScope(props.api.state.path)
    props.controller.list()
    void props.controller.restore()
  })
  return <></>
}

const tui: TuiPlugin = async (api, options) => {
  const config = pluginConfig(options)
  const mcp = createMcpController(api, config.persistMcp)
  const todo = createTodoController(api)

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

  api.event.on("mcp.tools.changed", () => {
    void mcp.refresh().catch(() => {})
  })

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
        return <SidebarContent api={api} mcp={mcp} todo={todo} sessionID={props.session_id} />
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id: PLUGIN_ID,
  tui,
}

export default plugin
