import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { batch, createSignal } from "solid-js"
import type { PluginConfig } from "../config"
import { DEFAULT_SECTION_EXPANSION } from "../constants"
import { emptyPreferencesDocument, type DesiredMcpState, type PluginSettings } from "../preferences-schema"
import type { PreferencesStore } from "../preferences-store"
import { resolveSectionVisibility, type SidebarSection } from "../state"
import type { SkillInfo } from "./skills"

export type McpPreferencesAccess = {
  load(): Promise<void> | undefined
  desiredMcpState(scope: string, name: string): DesiredMcpState | undefined
  setDesiredMcpState(scope: string, name: string, state: DesiredMcpState): void
}

export function createPreferencesController(api: TuiPluginApi, defaults: PluginConfig, store: PreferencesStore) {
  const [sections, setSections] = createSignal(defaults.sections)
  const [expanded, setExpanded] = createSignal(DEFAULT_SECTION_EXPANSION)
  const [skippedSkills, setSkippedSkills] = createSignal(new Set<string>())
  const [toggleKey, setToggleKey] = createSignal(defaults.toggleKey)
  const [focusKey, setFocusKey] = createSignal(defaults.focusKey)
  const [persistMcp, setPersistMcp] = createSignal(defaults.persistMcp)
  const [lspIconStyle, setLspIconStyle] = createSignal(defaults.lspIconStyle)
  const [onboardingCompleted, setOnboardingCompleted] = createSignal(false)
  const pendingSectionValues = new Map<SidebarSection, boolean>()
  const pendingExpandedValues = new Map<SidebarSection, boolean>()
  const pendingSettings: Partial<PluginSettings> = {}
  const pendingSkippedSkills = new Set<string>()
  const pendingMcp = new Map<string, Map<string, DesiredMcpState>>()
  let desiredMcpByScope: Record<string, Record<string, DesiredMcpState>> = {}
  let resetLayoutPending = false
  let resetSettingsPending = false
  let resetSkillsPending = false
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

  function persistSettings(settings: Partial<PluginSettings>) {
    if (!hydrated) {
      Object.assign(pendingSettings, settings)
      return
    }
    persist(store.update({ behavior: settings }))
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
        const shouldRestoreDefaults = resetLayoutPending
        const shouldRestoreSettings = resetSettingsPending
        const shouldPersistSettings = Object.keys(pendingSettings).length > 0
        const shouldPersistSkills = resetSkillsPending || pendingSkippedSkills.size > 0
        const settingsToPersist = { ...pendingSettings }
        let nextSections = resetLayoutPending
          ? defaults.sections
          : resolveSectionVisibility(defaults.sections, loaded.global.layout?.sections)
        for (const [name, visible] of pendingSectionValues) nextSections = { ...nextSections, [name]: visible }
        let nextExpanded = resetLayoutPending
          ? DEFAULT_SECTION_EXPANSION
          : resolveSectionVisibility(DEFAULT_SECTION_EXPANSION, loaded.global.layout?.expanded)
        for (const [name, open] of pendingExpandedValues) nextExpanded = { ...nextExpanded, [name]: open }

        const savedSettings = shouldRestoreSettings ? {} : (loaded.global.behavior ?? {})
        const nextToggleKey = pendingSettings.toggleKey ?? savedSettings.toggleKey ?? defaults.toggleKey
        const nextFocusKey = pendingSettings.focusKey ?? savedSettings.focusKey ?? defaults.focusKey
        const nextSettings: PluginSettings = {
          toggleKey: validKey(nextToggleKey) ? nextToggleKey : defaults.toggleKey,
          focusKey: validKey(nextFocusKey) ? nextFocusKey : defaults.focusKey,
          persistMcp: pendingSettings.persistMcp ?? savedSettings.persistMcp ?? defaults.persistMcp,
          lspIconStyle: pendingSettings.lspIconStyle ?? savedSettings.lspIconStyle ?? defaults.lspIconStyle,
        }

        const savedSkills = loaded.user.skippedSkillConfirmations ?? []
        const nextSkipped = resetSkillsPending ? new Set<string>() : new Set(savedSkills)
        for (const name of pendingSkippedSkills) nextSkipped.add(name)

        desiredMcpByScope = Object.fromEntries(
          Object.entries(loaded.worktrees).map(([scope, value]) => [scope, { ...value.mcp }]),
        )
        for (const [scope, states] of pendingMcp) {
          desiredMcpByScope[scope] = { ...desiredMcpByScope[scope], ...Object.fromEntries(states) }
        }

        hydrated = true
        batch(() => {
          setSections(nextSections)
          setExpanded(nextExpanded)
          setSkippedSkills(nextSkipped)
          setToggleKey(nextSettings.toggleKey)
          setFocusKey(nextSettings.focusKey)
          setPersistMcp(nextSettings.persistMcp)
          setLspIconStyle(nextSettings.lspIconStyle)
          setOnboardingCompleted(loaded.user.onboardingCompleted === true)
        })
        pendingSectionValues.clear()
        pendingExpandedValues.clear()
        pendingSkippedSkills.clear()
        resetLayoutPending = false
        resetSettingsPending = false
        resetSkillsPending = false
        if (shouldRestoreDefaults) persist(store.update({ clearLayout: true }))
        if (shouldRestoreSettings || shouldPersistSettings) {
          persist(
            store.update({
              ...(shouldRestoreSettings ? { clearBehavior: true } : {}),
              ...(shouldPersistSettings ? { behavior: settingsToPersist } : {}),
            }),
          )
        }
        if (shouldPersistSkills) {
          persist(store.update({ user: { skippedSkillConfirmations: [...nextSkipped].sort() } }))
        }
        for (const [scope, states] of pendingMcp) {
          for (const [name, state] of states) persist(store.update({ mcp: { scope, name, state } }))
        }
        for (const name of Object.keys(pendingSettings) as Array<keyof PluginSettings>) delete pendingSettings[name]
        pendingMcp.clear()
      })
    return hydration
  }

  function setKey(value: string, name: "toggleKey" | "focusKey", setter: (value: string) => void) {
    void load()
    const next = value.trim()
    if (!validKey(next)) throw new Error("Enter a valid OpenCode keybinding")
    setter(next)
    persistSettings({ [name]: next })
  }

  return {
    sections,
    expanded,
    toggleKey,
    focusKey,
    persistMcp,
    lspIconStyle,
    skippedSkillCount: () => skippedSkills().size,
    load,
    async flush() {
      await hydration
      await store.flush()
    },
    toggleSection(name: SidebarSection) {
      void load()
      const next = { ...sections(), [name]: !sections()[name] }
      setSections(next)
      if (!hydrated) pendingSectionValues.set(name, next[name])
    },
    toggleSectionExpanded(name: SidebarSection) {
      void load()
      const next = { ...expanded(), [name]: !expanded()[name] }
      setExpanded(next)
      if (!hydrated) pendingExpandedValues.set(name, next[name])
    },
    async saveLayoutAsDefault() {
      await load()
      await store.update({ layout: { sections: sections(), expanded: expanded() } })
    },
    resetSections() {
      void load()
      resetLayoutPending = !hydrated
      pendingSectionValues.clear()
      pendingExpandedValues.clear()
      batch(() => {
        setSections(defaults.sections)
        setExpanded(DEFAULT_SECTION_EXPANSION)
      })
      if (hydrated) persist(store.update({ clearLayout: true }))
    },
    setToggleKey(value: string) {
      setKey(value, "toggleKey", setToggleKey)
    },
    setFocusKey(value: string) {
      setKey(value, "focusKey", setFocusKey)
    },
    toggleMcpPersistence() {
      void load()
      const next = !persistMcp()
      setPersistMcp(next)
      persistSettings({ persistMcp: next })
    },
    toggleLspIconStyle() {
      void load()
      const next = lspIconStyle() === "nerd" ? "text" : "nerd"
      setLspIconStyle(next)
      persistSettings({ lspIconStyle: next })
    },
    resetPluginSettings() {
      void load()
      resetSettingsPending = !hydrated
      for (const name of Object.keys(pendingSettings) as Array<keyof PluginSettings>) delete pendingSettings[name]
      batch(() => {
        setToggleKey(defaults.toggleKey)
        setFocusKey(defaults.focusKey)
        setPersistMcp(defaults.persistMcp)
        setLspIconStyle(defaults.lspIconStyle)
      })
      if (hydrated) persist(store.update({ clearBehavior: true }))
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
      if (hydrated) persist(store.update({ user: { skippedSkillConfirmations: [...next].sort() } }))
      else pendingSkippedSkills.add(key)
    },
    resetSkillConfirmations() {
      void load()
      setSkippedSkills(new Set<string>())
      if (hydrated) persist(store.update({ user: { skippedSkillConfirmations: [] } }))
      else {
        resetSkillsPending = true
        pendingSkippedSkills.clear()
      }
    },
    async claimFirstRun() {
      const request = load()
      if (!request) return false
      await request
      if (onboardingCompleted()) return false
      setOnboardingCompleted(true)
      persist(store.update({ user: { onboardingCompleted: true } }))
      return true
    },
    desiredMcpState(scope: string, name: string) {
      return desiredMcpByScope[scope]?.[name]
    },
    setDesiredMcpState(scope: string, name: string, state: DesiredMcpState) {
      void load()
      desiredMcpByScope = {
        ...desiredMcpByScope,
        [scope]: { ...desiredMcpByScope[scope], [name]: state },
      }
      if (hydrated) persist(store.update({ mcp: { scope, name, state } }))
      else {
        const states = pendingMcp.get(scope) ?? new Map<string, DesiredMcpState>()
        states.set(name, state)
        pendingMcp.set(scope, states)
      }
    },
  }
}

export type PreferencesController = ReturnType<typeof createPreferencesController>
