/** @jsxImportSource @opentui/solid */
import type {
  TuiPlugin,
  TuiPluginApi,
  TuiPluginModule,
  TuiSidebarLspItem,
  TuiSidebarMcpItem,
  TuiSidebarTodoItem,
} from "@opencode-ai/plugin/tui"
import type { Session, SessionStatus } from "@opencode-ai/sdk/v2"
import { TextAttributes } from "@opentui/core"
import { batch, createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js"
import { createSectionPreferencesStore, type SectionPreferencesStore } from "./preferences-store"
import {
  MCP_PREFERENCES_KEY,
  disabledMcpNames,
  mcpScope,
  mcpToggleAction,
  parseSectionVisibility,
  resolveSectionVisibility,
  setMcpDisabled,
  type SidebarSection,
  type SectionVisibility,
} from "./state"

const PLUGIN_ID = "opencode-pretty-sidebar"
const TOGGLE_COMMAND = `${PLUGIN_ID}.toggle`
// v0.4.0 persisted clicks even though its non-reactive bundle did not show them.
const TODO_OPEN_KEY = `${PLUGIN_ID}.todo-open.v2`
const SUBAGENTS_OPEN_KEY = `${PLUGIN_ID}.subagents-open.v2`
const SKILLS_OPEN_KEY = `${PLUGIN_ID}.skills-open.v2`
const ACTIONS_OPEN_KEY = `${PLUGIN_ID}.actions-open.v2`
const LSP_OPEN_KEY = `${PLUGIN_ID}.lsp-open.v2`
const MCP_OPEN_KEY = `${PLUGIN_ID}.mcp-open.v2`
const SECTION_VISIBILITY_KEY = `${PLUGIN_ID}.section-visibility`
const SKILL_CONFIRMATIONS_KEY = `${PLUGIN_ID}.skill-confirmations`
const ONBOARDING_KEY = `${PLUGIN_ID}.onboarding.v1`

const SECTION_DEFINITIONS: ReadonlyArray<{ name: SidebarSection; label: string }> = [
  { name: "todo", label: "Todo" },
  { name: "subagents", label: "Subagents" },
  { name: "skills", label: "Skills" },
  { name: "quick_actions", label: "Quick actions" },
  { name: "lsp", label: "LSP" },
  { name: "mcp", label: "MCP" },
]

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
  lspIconStyle: LspIconStyle
}

type LspIconStyle = "nerd" | "text"

type McpController = ReturnType<typeof createMcpController>
type TodoController = ReturnType<typeof createTodoController>
type SubagentController = ReturnType<typeof createSubagentController>
type SkillController = ReturnType<typeof createSkillController>
type PreferencesController = ReturnType<typeof createPreferencesController>
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
    lspIconStyle: options?.lsp_icon_style === "text" ? "text" : "nerd",
  }
}

export function createPreferencesController(
  api: TuiPluginApi,
  defaults: SectionVisibility,
  store: SectionPreferencesStore,
) {
  const [sections, setSections] = createSignal(defaults)
  const [skippedSkills, setSkippedSkills] = createSignal(new Set<string>())
  const pendingSectionValues = new Map<SidebarSection, boolean>()
  const pendingSkippedSkills = new Set<string>()
  let resetSectionsPending = false
  let resetSkillsPending = false
  let hydrated = false
  let hydration: Promise<void> | undefined
  let persistenceWarningShown = false

  function skillKey(skill: SkillInfo) {
    return skill.location || skill.name
  }

  function showPersistenceWarning() {
    if (persistenceWarningShown) return
    persistenceWarningShown = true
    api.ui.toast({
      variant: "warning",
      title: "Sidebar settings",
      message: "Section visibility could not be saved",
      duration: 4000,
    })
  }

  function persist(request: Promise<void>) {
    void request.catch(showPersistenceWarning)
  }

  function persistSections(next: SectionVisibility, values: Partial<SectionVisibility>) {
    setSections(next)
    persist(store.update({ values }, defaults))
  }

  function load() {
    if (hydrated) return Promise.resolve()
    if (!api.kv.ready) return
    if (hydration) return hydration

    const legacySections = api.kv.get(SECTION_VISIBILITY_KEY)
    hydration = store
      .load(legacySections)
      .catch(() => {
        showPersistenceWarning()
        return legacySections
      })
      .then((savedSections) => {
        let nextSections = resetSectionsPending ? defaults : resolveSectionVisibility(defaults, savedSections)
        for (const [name, visible] of pendingSectionValues) nextSections = { ...nextSections, [name]: visible }

        const saved = api.kv.get(SKILL_CONFIRMATIONS_KEY)
        const names = Array.isArray(saved) ? saved.filter((value): value is string => typeof value === "string") : []
        const nextSkipped = resetSkillsPending ? new Set<string>() : new Set<string>(names)
        for (const name of pendingSkippedSkills) nextSkipped.add(name)

        hydrated = true
        batch(() => {
          setSections(nextSections)
          setSkippedSkills(nextSkipped)
        })
        if (resetSectionsPending || pendingSectionValues.size > 0) {
          persist(
            store.update(
              { reset: resetSectionsPending, values: Object.fromEntries(pendingSectionValues) },
              defaults,
            ),
          )
        }
        if (resetSkillsPending || pendingSkippedSkills.size > 0) {
          api.kv.set(SKILL_CONFIRMATIONS_KEY, [...nextSkipped].sort())
        }
        pendingSectionValues.clear()
        pendingSkippedSkills.clear()
        resetSectionsPending = false
        resetSkillsPending = false
      })
    return hydration
  }

  return {
    sections,
    skippedSkillCount: () => skippedSkills().size,
    load,
    async flush() {
      if (!hydrated && !hydration && (resetSectionsPending || pendingSectionValues.size > 0)) {
        const deadline = Date.now() + 4_000
        while (!api.kv.ready && Date.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 10))
        }
        if (api.kv.ready) await load()
        else {
          await store.update(
            { reset: resetSectionsPending, values: Object.fromEntries(pendingSectionValues) },
            defaults,
          )
        }
      }
      await hydration
      await store.flush()
    },
    toggleSection(name: SidebarSection) {
      void load()
      const next = { ...sections(), [name]: !sections()[name] }
      if (hydrated) persistSections(next, { [name]: next[name] })
      else {
        setSections(next)
        pendingSectionValues.set(name, next[name])
      }
    },
    resetSections() {
      void load()
      if (hydrated) {
        setSections(defaults)
        persist(store.update({ reset: true }, defaults))
      }
      else {
        resetSectionsPending = true
        pendingSectionValues.clear()
        setSections(defaults)
      }
    },
    shouldConfirmSkill(skill: SkillInfo) {
      void load()
      return !skippedSkills().has(skillKey(skill))
    },
    skipSkillConfirmation(skill: SkillInfo) {
      void load()
      const key = skillKey(skill)
      const next = new Set(skippedSkills())
      next.add(key)
      setSkippedSkills(next)
      if (hydrated) api.kv.set(SKILL_CONFIRMATIONS_KEY, [...next].sort())
      else pendingSkippedSkills.add(key)
    },
    resetSkillConfirmations() {
      void load()
      setSkippedSkills(new Set<string>())
      if (hydrated) api.kv.set(SKILL_CONFIRMATIONS_KEY, [])
      else {
        resetSkillsPending = true
        pendingSkippedSkills.clear()
      }
    },
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

export function FirstRunWizard(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  toggleKey: string
  lspIconStyle: LspIconStyle
}) {
  const [active, setActive] = createSignal(0)
  const theme = () => props.api.theme.current
  const finishIndex = SECTION_DEFINITIONS.length

  function finish() {
    props.api.ui.dialog.clear()
  }

  function move(offset: number) {
    setActive((value) => (value + offset + finishIndex + 1) % (finishIndex + 1))
  }

  function select() {
    const index = active()
    if (index === finishIndex) finish()
    else props.preferences.toggleSection(SECTION_DEFINITIONS[index].name)
  }

  const unregister = props.api.keymap.registerLayer({
    mode: "modal",
    priority: 1000,
    commands: [
      {
        name: `${PLUGIN_ID}.wizard.previous`,
        run() {
          move(-1)
        },
      },
      {
        name: `${PLUGIN_ID}.wizard.next`,
        run() {
          move(1)
        },
      },
      {
        name: `${PLUGIN_ID}.wizard.select`,
        run: select,
      },
    ],
    bindings: [
      { key: "up", cmd: `${PLUGIN_ID}.wizard.previous` },
      { key: "down", cmd: `${PLUGIN_ID}.wizard.next` },
      { key: "tab", cmd: `${PLUGIN_ID}.wizard.next` },
      { key: "space", cmd: `${PLUGIN_ID}.wizard.select` },
      { key: "return", cmd: `${PLUGIN_ID}.wizard.select` },
    ],
  })
  onCleanup(unregister)

  return (
    <box paddingLeft={2} paddingRight={2} paddingBottom={1} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme().text}>
          Welcome to Pretty Sidebar
        </text>
        <text fg={theme().textMuted} onMouseDown={finish}>
          esc
        </text>
      </box>
      <text fg={theme().textMuted} wrapMode="word">
        Choose what appears in your sidebar. You can change these settings anytime with the gear button.
      </text>
      <box flexDirection="row" gap={2}>
        <text fg={theme().textMuted}>Toggle: {props.toggleKey}</text>
        <text fg={theme().textMuted}>
          LSP icons: {props.lspIconStyle === "text" ? "text badges" : "Nerd Font"}
        </text>
      </box>
      <text fg={theme().textMuted} wrapMode="word">
        Click section headers to collapse them. Click an LSP icon to reveal its server name.
      </text>
      <For each={SECTION_DEFINITIONS}>
        {(section, index) => {
          const selected = () => active() === index()
          return (
            <box
              flexDirection="row"
              gap={1}
              paddingLeft={1}
              paddingRight={1}
              backgroundColor={selected() ? theme().backgroundElement : undefined}
              onMouseOver={() => setActive(index())}
              onMouseDown={() => props.preferences.toggleSection(section.name)}
            >
              <text flexShrink={0} fg={props.preferences.sections()[section.name] ? theme().accent : theme().textMuted}>
                {props.preferences.sections()[section.name] ? "☑" : "☐"}
              </text>
              <text fg={selected() ? theme().text : theme().textMuted}>{section.label}</text>
            </box>
          )
        }}
      </For>
      <box flexDirection="row" justifyContent="flex-end">
        <box
          paddingLeft={2}
          paddingRight={2}
          backgroundColor={active() === finishIndex ? theme().primary : undefined}
          onMouseOver={() => setActive(finishIndex)}
          onMouseDown={finish}
        >
          <text fg={active() === finishIndex ? theme().selectedListItemText : theme().textMuted}>Finish</text>
        </box>
      </box>
    </box>
  )
}

export function openFirstRunWizard(
  api: TuiPluginApi,
  preferences: PreferencesController,
  toggleKey: string,
  lspIconStyle: LspIconStyle,
) {
  api.ui.dialog.replace(() => (
    <FirstRunWizard api={api} preferences={preferences} toggleKey={toggleKey} lspIconStyle={lspIconStyle} />
  ))
}

export function showFirstRunWizard(
  api: TuiPluginApi,
  preferences: PreferencesController,
  toggleKey: string,
  lspIconStyle: LspIconStyle,
) {
  if (api.kv.get(ONBOARDING_KEY) === true) return false
  api.kv.set(ONBOARDING_KEY, true)
  openFirstRunWizard(api, preferences, toggleKey, lspIconStyle)
  return true
}

function SettingsDialog(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  toggleKey: string
  lspIconStyle: LspIconStyle
}) {
  const options = createMemo(() => [
    ...SECTION_DEFINITIONS.map((section) => ({
      title: `${props.preferences.sections()[section.name] ? "☑" : "☐"} ${section.label}`,
      value: section.name,
      description: props.preferences.sections()[section.name] ? "visible" : "hidden",
    })),
    {
      title: "↺ Restore configured defaults",
      value: "reset_sections",
      description: "reset section visibility",
    },
    {
      title: "↺ Show skill confirmations again",
      value: "reset_skills",
      description: `${props.preferences.skippedSkillCount()} skipped`,
    },
    {
      title: "? Open quick setup guide",
      value: "wizard",
      description: "tips and section settings",
    },
  ])

  return (
    <props.api.ui.DialogSelect
      title="Sidebar settings"
      skipFilter={true}
      options={options()}
      onSelect={(option) => {
        if (option.value === "reset_sections") {
          props.preferences.resetSections()
          return
        }
        if (option.value === "reset_skills") {
          props.preferences.resetSkillConfirmations()
          return
        }
        if (option.value === "wizard") {
          openFirstRunWizard(props.api, props.preferences, props.toggleKey, props.lspIconStyle)
          return
        }
        props.preferences.toggleSection(option.value as SidebarSection)
      }}
    />
  )
}

function openSettings(
  api: TuiPluginApi,
  preferences: PreferencesController,
  toggleKey: string,
  lspIconStyle: LspIconStyle,
) {
  api.ui.dialog.replace(() => (
    <SettingsDialog
      api={api}
      preferences={preferences}
      toggleKey={toggleKey}
      lspIconStyle={lspIconStyle}
    />
  ))
}

function SkillDialog(props: {
  api: TuiPluginApi
  skill: SkillInfo
  onAccept: (skipConfirmation: boolean) => void
}) {
  const [skipConfirmation, setSkipConfirmation] = createSignal(false)
  const [active, setActive] = createSignal<"accept" | "cancel">("accept")
  const theme = () => props.api.theme.current

  function accept() {
    const skip = skipConfirmation()
    props.api.ui.dialog.clear()
    props.onAccept(skip)
  }

  function cancel() {
    props.api.ui.dialog.clear()
  }

  const unregister = props.api.keymap.registerLayer({
    mode: "modal",
    priority: 1000,
    commands: [
      {
        name: `${PLUGIN_ID}.skill-dialog.move`,
        run() {
          setActive((value) => (value === "accept" ? "cancel" : "accept"))
        },
      },
      {
        name: `${PLUGIN_ID}.skill-dialog.toggle-skip`,
        run() {
          setSkipConfirmation((value) => !value)
        },
      },
      {
        name: `${PLUGIN_ID}.skill-dialog.submit`,
        run() {
          if (active() === "accept") accept()
          else cancel()
        },
      },
    ],
    bindings: [
      { key: "left", cmd: `${PLUGIN_ID}.skill-dialog.move` },
      { key: "right", cmd: `${PLUGIN_ID}.skill-dialog.move` },
      { key: "tab", cmd: `${PLUGIN_ID}.skill-dialog.move` },
      { key: "space", cmd: `${PLUGIN_ID}.skill-dialog.toggle-skip` },
      { key: "return", cmd: `${PLUGIN_ID}.skill-dialog.submit` },
    ],
  })
  onCleanup(unregister)

  return (
    <box paddingLeft={2} paddingRight={2} paddingBottom={1} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme().text}>
          {props.skill.name}
        </text>
        <text fg={theme().textMuted} onMouseDown={cancel}>
          esc
        </text>
      </box>
      <scrollbox maxHeight={12} scrollbarOptions={{ visible: false }}>
        <text fg={theme().textMuted} wrapMode="word">
          {props.skill.description?.trim() || "No description available."}
        </text>
      </scrollbox>
      <box
        flexDirection="row"
        gap={1}
        onMouseDown={() => setSkipConfirmation((value) => !value)}
      >
        <text fg={skipConfirmation() ? theme().accent : theme().textMuted}>
          {skipConfirmation() ? "☑" : "☐"}
        </text>
        <text fg={theme().text}>Don't show again for this skill</text>
        <text fg={theme().textMuted}>(space)</text>
      </box>
      <box flexDirection="row" justifyContent="flex-end">
        <box
          paddingLeft={1}
          paddingRight={1}
          backgroundColor={active() === "cancel" ? theme().primary : undefined}
          onMouseOver={() => setActive("cancel")}
          onMouseDown={cancel}
        >
          <text fg={active() === "cancel" ? theme().selectedListItemText : theme().textMuted}>Cancel</text>
        </box>
        <box
          paddingLeft={1}
          paddingRight={1}
          backgroundColor={active() === "accept" ? theme().primary : undefined}
          onMouseOver={() => setActive("accept")}
          onMouseDown={accept}
        >
          <text fg={active() === "accept" ? theme().selectedListItemText : theme().textMuted}>Accept</text>
        </box>
      </box>
    </box>
  )
}

function SidebarTitle(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  toggleKey: string
  lspIconStyle: LspIconStyle
  sessionID: string
  title: string
}) {
  const theme = () => props.api.theme.current
  const status = createMemo(() => props.api.state.session.status(props.sessionID)?.type)
  const [settingsHover, setSettingsHover] = createSignal(false)

  return (
    <box border={["bottom"]} borderColor={theme().borderSubtle} paddingBottom={1} paddingRight={1}>
      <box flexDirection="row" justifyContent="space-between" gap={1}>
        <box flexDirection="row" gap={1} flexGrow={1}>
          <text flexShrink={0} fg={status() === "busy" ? theme().primary : theme().accent}>
            {status() === "busy" ? "●" : "◆"}
          </text>
          <text fg={theme().text} wrapMode="word">
            <b>{props.title}</b>
          </text>
        </box>
        <box
          flexShrink={0}
          alignSelf="flex-start"
          height={1}
          paddingLeft={1}
          paddingRight={1}
          backgroundColor={settingsHover() ? theme().backgroundElement : theme().backgroundPanel}
          onMouseOver={() => setSettingsHover(true)}
          onMouseOut={() => setSettingsHover(false)}
          onMouseUp={() => openSettings(props.api, props.preferences, props.toggleKey, props.lspIconStyle)}
        >
          <text fg={settingsHover() ? theme().accent : theme().textMuted}>⚙</text>
        </box>
      </box>
    </box>
  )
}

export function Section(props: {
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
      paddingLeft={1}
      paddingRight={1}
      gap={1}
    >
      <box flexDirection="row" justifyContent="space-between" gap={1} onMouseDown={props.onToggle}>
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

export function matchesFilter(query: string, ...values: Array<string | undefined>) {
  const needle = query.trim().toLocaleLowerCase()
  return !needle || values.some((value) => value?.toLocaleLowerCase().includes(needle))
}

export function SectionFilter(props: {
  api: TuiPluginApi
  query: string
  placeholder: string
  onInput: (value: string) => void
}) {
  const [focused, setFocused] = createSignal(false)
  const theme = () => props.api.theme.current

  return (
    <box
      flexDirection="row"
      gap={1}
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={focused() ? theme().backgroundElement : theme().backgroundPanel}
      onMouseDown={() => setFocused(true)}
    >
      <text flexShrink={0} fg={focused() ? theme().accent : theme().textMuted}>⌕</text>
      <input
        flexGrow={1}
        value={props.query}
        placeholder={props.placeholder}
        placeholderColor={theme().textMuted}
        textColor={theme().text}
        focusedTextColor={theme().text}
        backgroundColor="transparent"
        focusedBackgroundColor="transparent"
        cursorColor={theme().accent}
        focused={focused()}
        onInput={props.onInput}
        onSubmit={() => setFocused(false)}
        onKeyDown={(event) => {
          if (event.name !== "escape") return
          event.preventDefault()
          event.stopPropagation()
          setFocused(false)
        }}
      />
      <Show when={props.query}>
        <text flexShrink={0} fg={theme().textMuted} onMouseDown={() => props.onInput("")}>×</text>
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
      onMouseDown={props.onOpen}
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
      <text flexGrow={1} fg={theme().text} wrapMode="word">
        {props.item.name}
      </text>
    </box>
  )
}

export function SkillsSection(props: {
  api: TuiPluginApi
  controller: SkillController
  preferences: PreferencesController
}) {
  const initial = props.api.kv.get(SKILLS_OPEN_KEY, false)
  const [open, setOpen] = createSignal(typeof initial === "boolean" ? initial : false)
  const [query, setQuery] = createSignal("")
  const target = createMemo(() => props.controller.target())
  const list = createMemo(() => props.controller.list(target()))
  const filtered = createMemo(() => list().filter((item) => matchesFilter(query(), item.name, item.description)))
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

  async function useSkill(item: SkillInfo) {
    try {
      await props.controller.use(target(), item.name)
    } catch (cause) {
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
    <Section api={props.api} title="SKILLS" summary={`${list().length}`} open={open()} onToggle={toggle}>
      <Show
        when={!error()}
        fallback={<text fg={props.api.theme.current.error}>{error()}</text>}
      >
        <Show when={list().length > 0} fallback={<text fg={props.api.theme.current.textMuted}>No skills</text>}>
          <box>
            <SectionFilter api={props.api} query={query()} placeholder="Filter skills..." onInput={setQuery} />
            <Show
              when={filtered().length > 0}
              fallback={<text fg={props.api.theme.current.textMuted}>No matching skills</text>}
            >
              <box>
                <For each={filtered()}>
                  {(item) => <SkillRow api={props.api} item={item} onUse={() => selectSkill(item)} />}
                </For>
              </box>
            </Show>
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
      onMouseDown={run}
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
      <box>
        <For each={QUICK_ACTIONS}>{(action) => <QuickActionRow api={props.api} action={action} />}</For>
      </box>
    </Section>
  )
}

const LSP_ICONS: Readonly<Record<string, Record<LspIconStyle, string>>> = {
  zls: { nerd: "", text: "Zg" },
  "yaml-ls": { nerd: "", text: "Yml" },
  vue: { nerd: "󰡄", text: "Vue" },
  typescript: { nerd: "󰛦", text: "TS" },
  tinymist: { nerd: "", text: "Typ" },
  texlab: { nerd: "", text: "TeX" },
  terraform: { nerd: "󱁢", text: "Tf" },
  svelte: { nerd: "", text: "Sv" },
  "sourcekit-lsp": { nerd: "󰛥", text: "Sw" },
  rust: { nerd: "󱘗", text: "Rs" },
  "ruby-lsp": { nerd: "󰴭", text: "Rb" },
  razor: { nerd: "", text: "Rz" },
  pyright: { nerd: "󰌠", text: "Py" },
  prisma: { nerd: "", text: "Pr" },
  "php intelephense": { nerd: "󰌟", text: "PHP" },
  oxlint: { nerd: "", text: "Ox" },
  "ocaml-lsp": { nerd: "", text: "Ml" },
  nixd: { nerd: "󱄅", text: "Nix" },
  "lua-ls": { nerd: "󰢱", text: "Lua" },
  "kotlin-ls": { nerd: "󱈙", text: "Kt" },
  julials: { nerd: "", text: "Jl" },
  jdtls: { nerd: "󰬷", text: "Jv" },
  "haskell-language-server": { nerd: "󰲒", text: "Hs" },
  gopls: { nerd: "󰟓", text: "Go" },
  gleam: { nerd: "", text: "Gl" },
  fsharp: { nerd: "", text: "F#" },
  "elixir-ls": { nerd: "", text: "Ex" },
  eslint: { nerd: "", text: "ES" },
  dockerfile: { nerd: "󰡨", text: "Dk" },
  deno: { nerd: "", text: "Dn" },
  dart: { nerd: "", text: "Dt" },
  "clojure-lsp": { nerd: "", text: "Clj" },
  clangd: { nerd: "󰙲", text: "C++" },
  csharp: { nerd: "󰌛", text: "C#" },
  biome: { nerd: "", text: "Bm" },
  bash: { nerd: "", text: "Sh" },
  astro: { nerd: "", text: "Ast" },
  json: { nerd: "󰘦", text: "{}" },
  tailwind: { nerd: "", text: "TW" },
  css: { nerd: "󰌜", text: "CSS" },
  html: { nerd: "󰌝", text: "HTM" },
}

function lspIconName(id: string) {
  const name = id.toLowerCase()
  if (Object.hasOwn(LSP_ICONS, name)) return name
  if (name.includes("typescript") || name.includes("tsserver") || name.includes("javascript")) return "typescript"
  if (name.includes("eslint")) return "eslint"
  if (name.includes("biome")) return "biome"
  if (name.includes("deno")) return "deno"
  if (name.includes("pyright") || name.includes("pylsp") || name.includes("ruff") || name === "ty") return "pyright"
  if (name.includes("gopls") || name === "go") return "gopls"
  if (name.includes("rust")) return "rust"
  if (name.includes("clang") || name.includes("ccls") || name.includes("c++")) return "clangd"
  if (name.includes("lua")) return "lua-ls"
  if (name.includes("ruby")) return "ruby-lsp"
  if (name.includes("java") || name.includes("jdt")) return "jdtls"
  if (name.includes("kotlin")) return "kotlin-ls"
  if (name.includes("csharp") || name.includes("omnisharp")) return "csharp"
  if (name.includes("fsharp")) return "fsharp"
  if (name.includes("elixir")) return "elixir-ls"
  if (name.includes("terraform")) return "terraform"
  if (name.includes("yaml")) return "yaml-ls"
  if (name.includes("json")) return "json"
  if (name.includes("tailwind")) return "tailwind"
  if (name.includes("css")) return "css"
  if (name.includes("html")) return "html"
  if (name.includes("bash") || name.includes("shell")) return "bash"
  if (name.includes("docker")) return "dockerfile"
  if (name.includes("php")) return "php intelephense"
  if (name.includes("dart")) return "dart"
  if (name.includes("zig") || name.includes("zls")) return "zls"
  if (name.includes("ocaml")) return "ocaml-lsp"
  if (name.includes("swift") || name.includes("sourcekit")) return "sourcekit-lsp"
  if (name.includes("prisma")) return "prisma"
}

export function lspIcon(id: string, style: LspIconStyle = "nerd") {
  const name = lspIconName(id)
  return name ? LSP_ICONS[name][style] : id
}

export function LspBadge(props: {
  api: TuiPluginApi
  id: string
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

  return (
    <box flexDirection="row" gap={1} flexShrink={0}>
      <text flexShrink={0} fg={statusColor()} onMouseDown={() => setShowName((value) => !value)}>
        {lspIcon(props.id, props.iconStyle)}
      </text>
      <Show when={showName()}>
        <text flexShrink={0} fg={props.api.theme.current.textMuted} wrapMode="none">
          {props.id}
        </text>
      </Show>
    </box>
  )
}

function LspSection(props: { api: TuiPluginApi; iconStyle: LspIconStyle }) {
  const initial = props.api.kv.get(LSP_OPEN_KEY, false)
  const [open, setOpen] = createSignal(typeof initial === "boolean" ? initial : false)
  const list = createMemo(() => props.api.state.lsp())
  const connected = createMemo(() => list().filter((item) => item.status === "connected").length)
  const disabled = createMemo(() => !props.api.state.config.lsp)

  function toggle() {
    setOpen((value) => {
      props.api.kv.set(LSP_OPEN_KEY, !value)
      return !value
    })
  }

  return (
    <Section api={props.api} title="LSP" summary={`${connected()}/${list().length}`} open={open()} onToggle={toggle}>
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
            {(item: TuiSidebarLspItem) => (
              <LspBadge api={props.api} id={item.id} status={item.status} iconStyle={props.iconStyle} />
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
      onMouseDown={() => !props.disabled && props.onToggle()}
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

export function McpSection(props: { api: TuiPluginApi; controller: McpController }) {
  const initial = props.api.kv.get(MCP_OPEN_KEY, false)
  const [open, setOpen] = createSignal(typeof initial === "boolean" ? initial : false)
  const [loading, setLoading] = createSignal<string>()
  const [query, setQuery] = createSignal("")
  const list = props.controller.list
  const filtered = createMemo(() => list().filter((item) => matchesFilter(query(), item.name)))
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
          <SectionFilter api={props.api} query={query()} placeholder="Filter MCP..." onInput={setQuery} />
          <Show
            when={filtered().length > 0}
            fallback={<text fg={props.api.theme.current.textMuted}>No matching MCP servers</text>}
          >
            <box>
              <For each={filtered()}>
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
  preferences: PreferencesController
  lspIconStyle: LspIconStyle
  sessionID: string
}) {
  const sections = props.preferences.sections

  return (
    <box gap={1}>
      <Show when={sections().todo}>
        <TodoSection api={props.api} controller={props.todo} sessionID={props.sessionID} />
      </Show>
      <Show when={sections().subagents}>
        <SubagentSection api={props.api} controller={props.subagents} sessionID={props.sessionID} />
      </Show>
      <Show when={sections().skills}>
        <SkillsSection api={props.api} controller={props.skills} preferences={props.preferences} />
      </Show>
      <Show when={sections().quick_actions}>
        <QuickActionsSection api={props.api} />
      </Show>
      <Show when={sections().lsp}>
        <LspSection api={props.api} iconStyle={props.lspIconStyle} />
      </Show>
      <Show when={sections().mcp}>
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

function PreferencesPersistence(props: { api: TuiPluginApi; controller: PreferencesController }) {
  createEffect(() => {
    if (!props.api.kv.ready) return
    void props.controller.load()
  })
  return <></>
}

function FirstRunWizardPersistence(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  toggleKey: string
  lspIconStyle: LspIconStyle
}) {
  let checked = false
  createEffect(() => {
    if (checked || !props.api.kv.ready) return
    checked = true
    showFirstRunWizard(props.api, props.preferences, props.toggleKey, props.lspIconStyle)
  })
  return <></>
}

const tui: TuiPlugin = async (api, options) => {
  const config = pluginConfig(options)
  const mcp = createMcpController(api, config.persistMcp)
  const todo = createTodoController(api)
  const subagents = createSubagentController(api)
  const skills = createSkillController(api)
  const preferences = createPreferencesController(
    api,
    config.sections,
    createSectionPreferencesStore(api.state.path.state),
  )
  api.lifecycle.onDispose(() => preferences.flush())

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
        return (
          <>
            <PreferencesPersistence api={api} controller={preferences} />
            <FirstRunWizardPersistence
              api={api}
              preferences={preferences}
              toggleKey={config.toggleKey}
              lspIconStyle={config.lspIconStyle}
            />
            <McpPersistence api={api} controller={mcp} />
          </>
        )
      },
      sidebar_title(_ctx, props) {
        return (
          <SidebarTitle
            api={api}
            preferences={preferences}
            toggleKey={config.toggleKey}
            lspIconStyle={config.lspIconStyle}
            sessionID={props.session_id}
            title={props.title}
          />
        )
      },
      sidebar_content(_ctx, props) {
        return (
          <SidebarContent
            api={api}
            mcp={mcp}
            todo={todo}
            subagents={subagents}
            skills={skills}
            preferences={preferences}
            lspIconStyle={config.lspIconStyle}
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
