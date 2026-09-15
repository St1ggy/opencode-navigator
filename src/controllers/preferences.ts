import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { createSignal } from "solid-js"
import type { PluginConfig } from "../config"
import { DEFAULT_SECTION_EXPANSION } from "../constants"
import {
  emptyPreferencesDocument,
  resolvePreferences,
  type DesiredMcpState,
  type PreferenceValues,
  type PreferencesDocument,
  type ResolvedPreferences,
  type ScopedPreferences,
} from "../preferences-schema"
import {
  applyPreferencesUpdate,
  type PreferencesStore,
  type PreferencesUpdate,
  type PreferenceTarget,
} from "../preferences-store"
import { SIDEBAR_SECTIONS, type SidebarSection } from "../state"
import type { SkillInfo } from "./skills"

export type McpPreferencesAccess = {
  load(): Promise<void> | undefined
  desiredMcpState(scope: string, name: string): DesiredMcpState | undefined
  setDesiredMcpState(scope: string, name: string, state: DesiredMcpState): void
}

type PreferenceScope = "global" | "worktree"

function targetKey(target: PreferenceTarget) {
  return target.kind === "global" ? "global" : `worktree:${target.key}`
}

function targetForScope(scope: string): PreferenceTarget {
  return scope === "global" ? { kind: "global" } : { kind: "worktree", key: scope }
}

function values(scope: ScopedPreferences | undefined): PreferenceValues | undefined {
  if (!scope) return
  return {
    behavior: scope.behavior,
    layout: scope.layout,
    desiredMcpStates: scope.mcp,
  }
}

export function createPreferencesController(api: TuiPluginApi, defaults: PluginConfig, store: PreferencesStore) {
  const builtIns: ResolvedPreferences = {
    behavior: {
      toggleKey: defaults.toggleKey,
      focusKey: defaults.focusKey,
      persistMcp: defaults.persistMcp,
      lspIconStyle: defaults.lspIconStyle,
    },
    layout: {
      sections: defaults.sections,
      expanded: DEFAULT_SECTION_EXPANSION,
      order: defaults.sectionOrder ?? [...SIDEBAR_SECTIONS],
    },
    desiredMcpStates: {},
  }
  const [resolved, setResolved] = createSignal(builtIns)
  const [skippedSkills, setSkippedSkills] = createSignal(new Set<string>())
  const [onboardingCompleted, setOnboardingCompleted] = createSignal(false)
  const [activeTarget, setActiveTarget] = createSignal<PreferenceTarget>({ kind: "global" })
  const [preferenceScope, setPreferenceScope] = createSignal<PreferenceScope>("global")
  const [revision, setRevision] = createSignal(0)
  const sessionLayouts = new Map<string, ResolvedPreferences["layout"]>()
  const pendingUpdates: PreferencesUpdate[] = []
  let document: PreferencesDocument = emptyPreferencesDocument()
  let hydrated = false
  let hydration: Promise<void> | undefined
  let persistenceWarningShown = false

  function skillKey(skill: SkillInfo) {
    return skill.location || skill.name
  }

  function showPersistenceWarning(cause?: unknown) {
    if (persistenceWarningShown) return
    persistenceWarningShown = true
    api.ui.toast({
      variant: "warning",
      title: "Sidebar settings",
      message: cause instanceof Error ? cause.message : "Sidebar settings could not be saved",
      duration: 4000,
    })
  }

  function persist(request: Promise<void>) {
    void request.catch(showPersistenceWarning)
  }

  function validKey(value: string) {
    try {
      return api.keymap?.parseKeySequence ? api.keymap.parseKeySequence(value).length > 0 : Boolean(value.trim())
    } catch {
      return false
    }
  }

  function resolveTarget(target: PreferenceTarget, session = true) {
    const worktree = target.kind === "worktree" ? document.worktrees[target.key] : undefined
    const globalSession = session ? sessionLayouts.get("global") : undefined
    const result = resolvePreferences({
      builtIns,
      global: {
        ...values(document.global),
        ...(globalSession ? { layout: globalSession } : {}),
      },
      worktree: values(worktree),
      session: session && target.kind === "worktree" ? { layout: sessionLayouts.get(targetKey(target)) } : undefined,
    })
    return {
      ...result,
      behavior: {
        ...result.behavior,
        toggleKey: validKey(result.behavior.toggleKey) ? result.behavior.toggleKey : defaults.toggleKey,
        focusKey: validKey(result.behavior.focusKey) ? result.behavior.focusKey : defaults.focusKey,
      },
    }
  }

  function refreshResolved() {
    setResolved(resolveTarget(activeTarget()))
    setRevision((value) => value + 1)
  }

  function selectedTarget() {
    const active = activeTarget()
    return preferenceScope() === "worktree" && active.kind === "worktree" ? active : { kind: "global" as const }
  }

  function selectedResolved() {
    revision()
    return resolveTarget(selectedTarget(), false)
  }

  function selectedLayoutResolved() {
    revision()
    return resolveTarget(selectedTarget())
  }

  function update(update: PreferencesUpdate) {
    document = applyPreferencesUpdate(document, update)
    if (hydrated) persist(store.update(update))
    else pendingUpdates.push(update)
    refreshResolved()
  }

  function load() {
    if (hydrated) return Promise.resolve()
    if (hydration) return hydration
    hydration = store
      .load()
      .catch((cause) => {
        showPersistenceWarning(cause)
        return emptyPreferencesDocument()
      })
      .then((loaded) => {
        document = pendingUpdates.reduce(applyPreferencesUpdate, loaded)
        hydrated = true
        const queued = pendingUpdates.splice(0)
        for (const update of queued) persist(store.update(update))
        setSkippedSkills(new Set(document.user.skippedSkillConfirmations ?? []))
        setOnboardingCompleted(document.user.onboardingCompleted === true)
        refreshResolved()
      })
    return hydration
  }

  function setKey(value: string, name: "toggleKey" | "focusKey") {
    void load()
    const next = value.trim()
    if (!validKey(next)) throw new Error("Enter a valid OpenCode keybinding")
    update({ target: selectedTarget(), behavior: { [name]: next } })
  }

  function setSessionLayout(layout: ResolvedPreferences["layout"]) {
    sessionLayouts.set(targetKey(activeTarget()), layout)
    refreshResolved()
  }

  function setSelectedSessionLayout(layout: ResolvedPreferences["layout"]) {
    sessionLayouts.set(targetKey(selectedTarget()), layout)
    refreshResolved()
  }

  return {
    sections: () => resolved().layout.sections,
    expanded: () => resolved().layout.expanded,
    sectionOrder: () => resolved().layout.order,
    toggleKey: () => resolved().behavior.toggleKey,
    focusKey: () => resolved().behavior.focusKey,
    persistMcp: () => resolved().behavior.persistMcp,
    lspIconStyle: () => resolved().behavior.lspIconStyle,
    selectedToggleKey: () => selectedResolved().behavior.toggleKey,
    selectedFocusKey: () => selectedResolved().behavior.focusKey,
    selectedPersistMcp: () => selectedResolved().behavior.persistMcp,
    selectedLspIconStyle: () => selectedResolved().behavior.lspIconStyle,
    selectedSections: () => selectedLayoutResolved().layout.sections,
    selectedExpanded: () => selectedLayoutResolved().layout.expanded,
    selectedSectionOrder: () => selectedLayoutResolved().layout.order,
    preferenceScope,
    canUseWorktreeScope: () => activeTarget().kind === "worktree",
    preferenceScopeLabel: () => {
      const target = activeTarget()
      return preferenceScope() === "worktree" && target.kind === "worktree" ? target.key : "Global"
    },
    skippedSkillCount: () => skippedSkills().size,
    load,
    setActiveScope(scope: string) {
      const next = targetForScope(scope)
      if (targetKey(next) === targetKey(activeTarget())) return
      setActiveTarget(next)
      if (next.kind === "global" && preferenceScope() === "worktree") setPreferenceScope("global")
      refreshResolved()
    },
    setPreferenceScope(scope: PreferenceScope) {
      setPreferenceScope(scope === "worktree" && activeTarget().kind === "global" ? "global" : scope)
      setRevision((value) => value + 1)
    },
    async flush() {
      await hydration
      await store.flush()
    },
    toggleSection(name: SidebarSection) {
      void load()
      setSessionLayout({
        ...resolved().layout,
        sections: { ...resolved().layout.sections, [name]: !resolved().layout.sections[name] },
      })
    },
    toggleSectionExpanded(name: SidebarSection) {
      void load()
      setSessionLayout({
        ...resolved().layout,
        expanded: { ...resolved().layout.expanded, [name]: !resolved().layout.expanded[name] },
      })
    },
    moveSection(name: SidebarSection, direction: -1 | 1) {
      void load()
      const order = [...resolved().layout.order]
      const index = order.indexOf(name)
      const destination = index + direction
      if (index < 0 || destination < 0 || destination >= order.length) return
      ;[order[index], order[destination]] = [order[destination], order[index]]
      setSessionLayout({ ...resolved().layout, order })
    },
    toggleSelectedSection(name: SidebarSection) {
      void load()
      const layout = resolveTarget(selectedTarget()).layout
      setSelectedSessionLayout({ ...layout, sections: { ...layout.sections, [name]: !layout.sections[name] } })
    },
    moveSelectedSection(name: SidebarSection, direction: -1 | 1) {
      void load()
      const layout = resolveTarget(selectedTarget()).layout
      const order = [...layout.order]
      const index = order.indexOf(name)
      const destination = index + direction
      if (index < 0 || destination < 0 || destination >= order.length) return
      ;[order[index], order[destination]] = [order[destination], order[index]]
      setSelectedSessionLayout({ ...layout, order })
    },
    async saveLayoutAsDefault() {
      await load()
      const target = selectedTarget()
      const layout = sessionLayouts.get(targetKey(target)) ?? resolved().layout
      document = applyPreferencesUpdate(document, { target, layout })
      await store.update({ target, layout })
      refreshResolved()
    },
    resetSections() {
      void load()
      const target = selectedTarget()
      sessionLayouts.delete(targetKey(target))
      update({ target, clearLayout: true })
    },
    setToggleKey(value: string) {
      setKey(value, "toggleKey")
    },
    setFocusKey(value: string) {
      setKey(value, "focusKey")
    },
    toggleMcpPersistence() {
      void load()
      update({ target: selectedTarget(), behavior: { persistMcp: !selectedResolved().behavior.persistMcp } })
    },
    toggleLspIconStyle() {
      void load()
      update({
        target: selectedTarget(),
        behavior: { lspIconStyle: selectedResolved().behavior.lspIconStyle === "nerd" ? "text" : "nerd" },
      })
    },
    resetPluginSettings() {
      void load()
      update({ target: selectedTarget(), clearBehavior: true })
    },
    resetMcpStates() {
      void load()
      update({ target: selectedTarget(), clearMcp: true })
    },
    shouldConfirmSkill(skill: SkillInfo) {
      void load()
      return !skippedSkills().has(skillKey(skill))
    },
    skipSkillConfirmation(skill: SkillInfo) {
      void load()
      const next = new Set(skippedSkills())
      next.add(skillKey(skill))
      setSkippedSkills(next)
      update({ user: { skippedSkillConfirmations: [...next].sort() } })
    },
    resetSkillConfirmations() {
      void load()
      setSkippedSkills(new Set<string>())
      update({ user: { skippedSkillConfirmations: [] } })
    },
    async claimFirstRun() {
      await load()
      if (onboardingCompleted()) return false
      setOnboardingCompleted(true)
      update({ user: { onboardingCompleted: true } })
      return true
    },
    desiredMcpState(scope: string, name: string) {
      revision()
      return resolveTarget(targetForScope(scope), false).desiredMcpStates[name]
    },
    setDesiredMcpState(scope: string, name: string, state: DesiredMcpState) {
      void load()
      update({ target: targetForScope(scope), mcp: { name, state } })
    },
  }
}

export type PreferencesController = ReturnType<typeof createPreferencesController>
