import { createSignal } from 'solid-js'

import {
  DEFAULT_SECTION_EXPANSION,
  type PluginConfig,
  type QuickActionId,
  SIDEBAR_SECTIONS,
  type SidebarSection,
} from '../../../shared/config'
import { layoutPresetPreview } from '../../../shared/lib/preset-preview'

import { type PortableSettings, parsePortableSettings, serializePortableSettings } from './portable-settings'
import {
  type DesiredMcpState,
  type LayoutPresets,
  type McpPresets,
  type McpServerGroups,
  type PreferenceValues,
  type PreferencesDocument,
  type ResolvedPreferences,
  type ScopedPreferences,
  type SectionLayoutDefault,
  emptyPreferencesDocument,
  parseRecentQuickActions,
  parseRecentSkills,
  resolvePreferences,
} from './schema'
import { type PreferenceTarget, type PreferencesStore, type PreferencesUpdate, applyPreferencesUpdate } from './store'

import type { ConfiguredDefaults } from './configured-defaults'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

type PreferenceSkill = { location: string }

export type McpPreferencesAccess = {
  load(): Promise<void> | undefined
  desiredMcpState(scope: string, name: string): DesiredMcpState | undefined
  setDesiredMcpState(scope: string, name: string, state: DesiredMcpState): void
  setDesiredMcpStates?(scope: string, states: Record<string, DesiredMcpState>): void
}

type PreferenceScope = 'global' | 'worktree'
type McpPresetUpdate = NonNullable<NonNullable<PreferencesUpdate['user']>['mcpPreset']>
type SessionLayout = NonNullable<PreferenceValues['layout']>

function swap<T>(items: T[], first: number, second: number) {
  const value = items[first]

  items[first] = items[second]
  items[second] = value
}

function targetKey(target: PreferenceTarget) {
  return target.kind === 'global' ? 'global' : `worktree:${target.key}`
}

function targetForScope(scope: string): PreferenceTarget {
  return scope === 'global' ? { kind: 'global' } : { kind: 'worktree', key: scope }
}

function values(scope: ScopedPreferences | undefined): PreferenceValues | undefined {
  if (!scope) return

  return {
    behavior: scope.behavior,
    layout: scope.layout,
    desiredMcpStates: scope.mcp,
  }
}

function mergeSessionLayout(base: SectionLayoutDefault | undefined, session: SessionLayout): SectionLayoutDefault {
  const order = session.order ?? base?.order

  return {
    sections: { ...base?.sections, ...session.sections },
    expanded: { ...base?.expanded, ...session.expanded },
    ...(order && { order: [...order] }),
  }
}

export function createPreferencesController(
  api: TuiPluginApi,
  defaults: PluginConfig,
  store: PreferencesStore,
  configured: ConfiguredDefaults = {},
) {
  const builtIns: ResolvedPreferences = {
    behavior: {
      toggleKey: defaults.toggleKey,
      focusKey: defaults.focusKey,
      searchKey: defaults.searchKey,
      persistMcp: defaults.persistMcp,
      cornerFont: defaults.cornerFont,
      lspIconStyle: defaults.lspIconStyle,
      rowDensity: defaults.rowDensity,
      sectionItemLimits: defaults.sectionItemLimits,
      quickActionOrder: defaults.quickActionOrder,
      quickActionVisibility: defaults.quickActionVisibility,
    },
    layout: {
      sections: defaults.sections,
      expanded: DEFAULT_SECTION_EXPANSION,
      order: defaults.sectionOrder ?? [...SIDEBAR_SECTIONS],
    },
    desiredMcpStates: {},
  }
  const [resolved, setResolved] = createSignal(resolvePreferences({ builtIns, pluginOptions: configured }))
  const [skippedSkills, setSkippedSkills] = createSignal(new Set<string>())
  const [onboardingCompleted, setOnboardingCompleted] = createSignal(false)
  const [activeTarget, setActiveTarget] = createSignal<PreferenceTarget>({ kind: 'global' })
  const [preferenceScope, setPreferenceScope] = createSignal<PreferenceScope>('global')
  const [layoutPresets, setLayoutPresets] = createSignal<LayoutPresets>(configured.layoutPresets ?? {})
  const [mcpPresets, setMcpPresets] = createSignal<McpPresets>(configured.mcpPresets ?? {})
  const [favoriteSkills, setFavoriteSkills] = createSignal(new Set<string>())
  const [favoriteMcpServers, setFavoriteMcpServers] = createSignal(new Set<string>())
  const [favoriteQuickActions, setFavoriteQuickActions] = createSignal(new Set<QuickActionId>())
  const [recentSkills, setRecentSkills] = createSignal<string[]>([])
  const [recentQuickActions, setRecentQuickActions] = createSignal<QuickActionId[]>([])
  const [mcpServerGroups, setMcpServerGroups] = createSignal<McpServerGroups>(configured.mcpServerGroups ?? {})
  const [ready, setReady] = createSignal(false)
  const [revision, setRevision] = createSignal(0)
  const sessionLayouts = new Map<string, SessionLayout>()
  const pendingUpdates: PreferencesUpdate[] = []
  let document: PreferencesDocument = emptyPreferencesDocument()
  let isHydrated = false
  let hydration: Promise<void> | undefined
  let mcpPresetRevision = 0
  let mcpPresetReconciliation = Promise.resolve()
  let isPersistenceWarningShown = false

  function skillKey(skill: PreferenceSkill) {
    return skill.location
  }

  function showPersistenceWarning(cause?: unknown) {
    if (isPersistenceWarningShown) return

    isPersistenceWarningShown = true
    api.ui.toast({
      variant: 'warning',
      title: 'Navigator settings',
      message: cause instanceof Error ? cause.message : 'Navigator settings could not be saved',
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
    const worktree = target.kind === 'worktree' ? document.worktrees[target.key] : undefined
    const globalSession = session ? sessionLayouts.get('global') : undefined
    const global = values(document.global)
    const result = resolvePreferences({
      builtIns,
      pluginOptions: configured,
      global: {
        ...global,
        ...(globalSession && { layout: mergeSessionLayout(document.global.layout, globalSession) }),
      },
      worktree: values(worktree),
      session: session && target.kind === 'worktree' ? { layout: sessionLayouts.get(targetKey(target)) } : undefined,
    })

    return {
      ...result,
      behavior: {
        ...result.behavior,
        toggleKey: validKey(result.behavior.toggleKey) ? result.behavior.toggleKey : defaults.toggleKey,
        focusKey: validKey(result.behavior.focusKey) ? result.behavior.focusKey : defaults.focusKey,
        searchKey: validKey(result.behavior.searchKey) ? result.behavior.searchKey : defaults.searchKey,
      },
    }
  }

  function refreshResolved() {
    setResolved(resolveTarget(activeTarget()))
    setRevision((value) => value + 1)
  }

  function selectedTarget() {
    const active = activeTarget()

    return preferenceScope() === 'worktree' && active.kind === 'worktree' ? active : { kind: 'global' as const }
  }

  function selectedResolved() {
    revision()

    return resolveTarget(selectedTarget(), false)
  }

  function selectedLayoutResolved() {
    revision()

    return resolveTarget(selectedTarget())
  }

  function workspaceProfiles() {
    revision()

    return { ...configured.workspaceProfiles, ...document.user.workspaceProfiles }
  }

  function scopeSnapshot(target = selectedTarget()) {
    const scope = target.kind === 'global' ? document.global : document.worktrees[target.key]

    return JSON.stringify({ layout: scope?.layout, mcp: scope?.mcp })
  }

  function update(change: PreferencesUpdate) {
    document = applyPreferencesUpdate(document, change)

    if (isHydrated) persist(store.update(change))
    else pendingUpdates.push(change)

    refreshResolved()
  }

  function load() {
    if (isHydrated) return Promise.resolve()

    if (hydration) return hydration

    hydration = store
      .load()
      .catch((error) => {
        showPersistenceWarning(error)

        return emptyPreferencesDocument()
      })
      .then((loaded) => {
        document = loaded
        for (const change of pendingUpdates) document = applyPreferencesUpdate(document, change)
        isHydrated = true
        const queued = [...pendingUpdates]

        pendingUpdates.length = 0

        for (const change of queued) persist(store.update(change))
        setSkippedSkills(new Set(document.user.skippedSkillConfirmations))
        setOnboardingCompleted(document.user.onboardingCompleted === true)
        setLayoutPresets({ ...configured.layoutPresets, ...document.user.layoutPresets })
        setMcpPresets({ ...configured.mcpPresets, ...document.user.mcpPresets })
        setFavoriteSkills(new Set(document.user.favoriteSkills))
        setFavoriteMcpServers(new Set(document.user.favoriteMcpServers))
        setFavoriteQuickActions(new Set(document.user.favoriteQuickActions))
        setRecentSkills(document.user.recentSkills ?? [])
        setRecentQuickActions(document.user.recentQuickActions ?? [])
        setMcpServerGroups({ ...configured.mcpServerGroups, ...document.user.mcpServerGroups })
        setReady(true)
        refreshResolved()
      })

    return hydration
  }

  function setKey(value: string, name: 'toggleKey' | 'focusKey' | 'searchKey') {
    void load()
    const next = value.trim()

    if (!validKey(next)) throw new Error('Enter a valid OpenCode keybinding')

    update({ target: selectedTarget(), behavior: { [name]: next } })
  }

  function setTargetSessionLayout(target: PreferenceTarget, layout: SessionLayout, replace = false) {
    const current = replace ? undefined : sessionLayouts.get(targetKey(target))
    const order = layout.order ?? current?.order

    sessionLayouts.set(targetKey(target), {
      sections: { ...current?.sections, ...layout.sections },
      expanded: { ...current?.expanded, ...layout.expanded },
      ...(order && { order: [...order] }),
    })
    refreshResolved()
  }

  function setSessionLayout(layout: SessionLayout) {
    setTargetSessionLayout(activeTarget(), layout)
  }

  function setSelectedSessionLayout(layout: SessionLayout, replace = false) {
    setTargetSessionLayout(selectedTarget(), layout, replace)
  }

  function normalizePresetName(value: string) {
    const name = value.trim()

    if (!name) throw new Error('Enter a preset name')

    if (name.length > 64) throw new Error('Preset names can contain at most 64 characters')

    return name
  }

  function currentLayoutPreset(): SectionLayoutDefault {
    const layout = selectedLayoutResolved().layout

    return {
      sections: { ...layout.sections },
      expanded: { ...layout.expanded },
      order: [...layout.order],
    }
  }

  function persistLayoutPresets(
    next: LayoutPresets,
    layoutPreset: NonNullable<PreferencesUpdate['user']>['layoutPreset'],
  ) {
    setLayoutPresets(next)
    update({ user: { layoutPreset } })
  }

  function persistMcpPresets(next: McpPresets, mcpPreset: McpPresetUpdate) {
    const generation = ++mcpPresetRevision

    setMcpPresets(next)
    update({ user: { mcpPreset } })

    if (!isHydrated) return

    mcpPresetReconciliation = store
      .flush()
      .then(() => store.load())
      .then((latest) => {
        if (generation !== mcpPresetRevision) return

        const actual = latest.user.mcpPresets ?? {}

        document = {
          ...document,
          user: { ...document.user, mcpPresets: Object.keys(actual).length > 0 ? actual : undefined },
        }
        setMcpPresets({ ...configured.mcpPresets, ...actual })
        const name = Object.keys(actual).find(
          (candidate) => candidate.toLocaleLowerCase() === mcpPreset.name.toLocaleLowerCase(),
        )
        let isApplied: boolean

        if (mcpPreset.operation === 'delete') isApplied = !name
        else if (mcpPreset.operation === 'rename') {
          isApplied =
            name === mcpPreset.name && (mcpPreset.previousName === mcpPreset.name || !actual[mcpPreset.previousName])
        } else {
          isApplied =
            Boolean(name) &&
            Object.keys(actual[name!]).length === Object.keys(mcpPreset.states).length &&
            Object.entries(mcpPreset.states).every(([server, state]) => actual[name!][server] === state)
        }

        if (!isApplied) {
          api.ui.toast({
            variant: 'warning',
            title: 'MCP presets',
            message: 'Preset changed in another OpenCode instance; reloaded saved presets',
            duration: 4000,
          })
        }
      })
      .catch(showPersistenceWarning)
  }

  function requireHydration() {
    void load()

    if (!isHydrated) throw new Error('Navigator preferences are still loading')
  }

  function toggleFavoriteSkill(skill: PreferenceSkill) {
    if (!isHydrated) {
      void load()?.then(() => toggleFavoriteSkill(skill))

      return
    }

    const next = new Set(favoriteSkills())
    const key = skillKey(skill)

    if (next.has(key)) next.delete(key)
    else next.add(key)

    setFavoriteSkills(next)
    update({ user: { favoriteSkill: { location: key, favorite: next.has(key) } } })
  }

  function toggleFavoriteMcpServer(name: string) {
    if (!isHydrated) {
      void load().then(() => toggleFavoriteMcpServer(name))

      return
    }

    if (!name) return

    const next = new Set(favoriteMcpServers())

    if (next.has(name)) next.delete(name)
    else next.add(name)

    setFavoriteMcpServers(next)
    update({ user: { favoriteMcpServer: { name, favorite: next.has(name) } } })
  }

  function toggleFavoriteQuickAction(id: QuickActionId) {
    if (!isHydrated) {
      void load().then(() => toggleFavoriteQuickAction(id))

      return
    }

    const next = new Set(favoriteQuickActions())

    if (next.has(id)) next.delete(id)
    else next.add(id)

    setFavoriteQuickActions(next)
    update({ user: { favoriteQuickAction: { id, favorite: next.has(id) } } })
  }

  return {
    sections: () => resolved().layout.sections,
    expanded: () => resolved().layout.expanded,
    sectionOrder: () => resolved().layout.order,
    toggleKey: () => resolved().behavior.toggleKey,
    focusKey: () => resolved().behavior.focusKey,
    searchKey: () => resolved().behavior.searchKey,
    persistMcp: () => resolved().behavior.persistMcp,
    cornerFont: () => resolved().behavior.cornerFont,
    lspIconStyle: () => resolved().behavior.lspIconStyle,
    rowDensity: () => resolved().behavior.rowDensity,
    selectedToggleKey: () => selectedResolved().behavior.toggleKey,
    selectedFocusKey: () => selectedResolved().behavior.focusKey,
    selectedSearchKey: () => selectedResolved().behavior.searchKey,
    selectedPersistMcp: () => selectedResolved().behavior.persistMcp,
    selectedCornerFont: () => selectedResolved().behavior.cornerFont,
    selectedLspIconStyle: () => selectedResolved().behavior.lspIconStyle,
    selectedRowDensity: () => selectedResolved().behavior.rowDensity,
    quickActionOrder: () => resolved().behavior.quickActionOrder,
    quickActionVisible: (id: QuickActionId) => resolved().behavior.quickActionVisibility[id] !== false,
    selectedQuickActionOrder: () => selectedResolved().behavior.quickActionOrder,
    selectedQuickActionVisible: (id: QuickActionId) => selectedResolved().behavior.quickActionVisibility[id] !== false,
    toggleQuickAction(id: QuickActionId) {
      void load()
      update({
        target: selectedTarget(),
        behavior: { quickActionVisibility: { [id]: selectedResolved().behavior.quickActionVisibility[id] === false } },
      })
    },
    moveQuickAction(id: QuickActionId, direction: -1 | 1) {
      void load()
      const order = [...selectedResolved().behavior.quickActionOrder]
      const index = order.indexOf(id)
      const destination = index + direction

      if (index === -1 || destination < 0 || destination >= order.length) return

      swap(order, index, destination)
      update({ target: selectedTarget(), behavior: { quickActionOrder: order } })
    },
    sectionItemLimit: (section: SidebarSection) => resolved().behavior.sectionItemLimits[section] ?? 0,
    selectedSectionItemLimit: (section: SidebarSection) => selectedResolved().behavior.sectionItemLimits[section] ?? 0,
    setSectionItemLimit(section: SidebarSection, value: number) {
      if (!Number.isSafeInteger(value) || value < 0) throw new Error('Enter a non-negative whole number (0 for All)')

      void load()
      update({ target: selectedTarget(), behavior: { sectionItemLimits: { [section]: value } } })
    },
    selectedSections: () => selectedLayoutResolved().layout.sections,
    selectedExpanded: () => selectedLayoutResolved().layout.expanded,
    selectedSectionOrder: () => selectedLayoutResolved().layout.order,
    layoutPresets,
    mcpPresets,
    workspaceProfiles,
    exportPortableSettings() {
      return serializePortableSettings(selectedLayoutResolved().layout, selectedResolved().desiredMcpStates)
    },
    previewPortableSettings(source: string) {
      requireHydration()
      const parsed = parsePortableSettings(source)
      const target = selectedTarget()
      const current = selectedResolved()
      const scope = target.kind === 'global' ? document.global : (document.worktrees[target.key] ?? {})
      const imported: ScopedPreferences = {
        ...scope,
        ...(parsed.settings.layout && { layout: parsed.settings.layout }),
        ...(parsed.settings.mcp && { mcp: parsed.settings.mcp }),
      }
      const next = resolvePreferences({
        builtIns,
        pluginOptions: configured,
        global: values(target.kind === 'global' ? imported : document.global),
        worktree: target.kind === 'worktree' ? values(imported) : undefined,
      })
      const layoutChanged = Boolean(
        parsed.settings.layout && JSON.stringify(next.layout) !== JSON.stringify(selectedLayoutResolved().layout),
      )
      const mcpChanged = Boolean(
        parsed.settings.mcp && JSON.stringify(next.desiredMcpStates) !== JSON.stringify(current.desiredMcpStates),
      )

      return {
        ...parsed,
        target: targetKey(target),
        expectedScope: scopeSnapshot(target),
        layoutChanged,
        mcpChanged,
      }
    },
    async applyPortableSettings(preview: { settings: PortableSettings; target: string; expectedScope: string }) {
      await load()
      const target = selectedTarget()

      if (preview.target !== targetKey(target)) throw new Error('Preference scope changed; reopen the import preview')

      const change: PreferencesUpdate = {
        target,
        expectedScope: preview.expectedScope,
        ...(preview.settings.layout && { layout: preview.settings.layout, clearLayout: true }),
        ...(preview.settings.mcp && { mcp: { states: preview.settings.mcp }, clearMcp: true }),
      }

      await store.update(change)
      document = await store.load()
      sessionLayouts.delete(targetKey(target))
      refreshResolved()
    },
    linkWorkspaceProfile(layout: string, mcp?: string) {
      requireHydration()

      if (!layoutPresets()[layout]) throw new Error('Layout preset no longer exists')

      if (mcp && !mcpPresets()[mcp]) throw new Error('MCP preset no longer exists')

      update({ user: { workspaceProfile: { layout, mcp } } })
    },
    favoriteSkills,
    favoriteMcpServers,
    favoriteQuickActions,
    toggleFavoriteMcpServer,
    toggleFavoriteQuickAction,
    recentSkills,
    recentQuickActions,
    mcpServerGroups,
    setMcpServerGroup(name: string, value?: string) {
      const group = value?.trim().slice(0, 64)
      const next = { ...mcpServerGroups() }

      if (group) {
        const canonical = Object.values(next).find((item) => item.toLocaleLowerCase() === group.toLocaleLowerCase())

        next[name] = canonical ?? group
      } else delete next[name]

      setMcpServerGroups(next)
      update({ user: { mcpServerGroup: { name, group } } })
    },
    async recordSkillUse(skill: PreferenceSkill) {
      await load()

      if (!skill.location) return

      setRecentSkills(parseRecentSkills([skill.location, ...recentSkills()]))
      update({ user: { recentSkill: skill.location } })
    },
    async recordQuickActionUse(id: QuickActionId) {
      await load()
      setRecentQuickActions(parseRecentQuickActions([id, ...recentQuickActions()]))
      update({ user: { recentQuickAction: id } })
    },
    ready,
    preferenceScope,
    selectedScopeKey: () => targetKey(selectedTarget()),
    canUseWorktreeScope: () => activeTarget().kind === 'worktree',
    preferenceScopeLabel: () => {
      const target = activeTarget()

      return preferenceScope() === 'worktree' && target.kind === 'worktree' ? target.key : 'Global'
    },
    skippedSkillCount: () => skippedSkills().size,
    trustedSkillLocations: () => [...skippedSkills()].sort(),
    load,
    setActiveScope(scope: string) {
      const next = targetForScope(scope)

      if (targetKey(next) === targetKey(activeTarget())) return

      setActiveTarget(next)

      if (next.kind === 'global' && preferenceScope() === 'worktree') setPreferenceScope('global')

      refreshResolved()
    },
    setPreferenceScope(scope: PreferenceScope) {
      setPreferenceScope(scope === 'worktree' && activeTarget().kind === 'global' ? 'global' : scope)
      setRevision((value) => value + 1)
    },
    async flush() {
      await hydration
      await store.flush()
      await mcpPresetReconciliation
    },
    toggleSection(name: SidebarSection) {
      void load()
      setSessionLayout({
        sections: { [name]: !resolved().layout.sections[name] },
      })
    },
    toggleSectionExpanded(name: SidebarSection) {
      void load()
      setSessionLayout({
        expanded: { [name]: !resolved().layout.expanded[name] },
      })
    },
    moveSection(name: SidebarSection, direction: -1 | 1) {
      void load()
      const order = [...resolved().layout.order]
      const index = order.indexOf(name)
      const destination = index + direction

      if (index === -1 || destination < 0 || destination >= order.length) return

      swap(order, index, destination)
      setSessionLayout({ order })
    },
    toggleSelectedSection(name: SidebarSection) {
      void load()
      const layout = resolveTarget(selectedTarget()).layout

      setSelectedSessionLayout({ sections: { [name]: !layout.sections[name] } })
    },
    moveSelectedSection(name: SidebarSection, direction: -1 | 1) {
      void load()
      const layout = resolveTarget(selectedTarget()).layout
      const order = [...layout.order]
      const index = order.indexOf(name)
      const destination = index + direction

      if (index === -1 || destination < 0 || destination >= order.length) return

      swap(order, index, destination)
      setSelectedSessionLayout({ order })
    },
    previewLayoutPreset(preset: SectionLayoutDefault) {
      return layoutPresetPreview(selectedLayoutResolved().layout, preset)
    },
    applyLayoutPreset(preset: SectionLayoutDefault) {
      void load()
      setSelectedSessionLayout(layoutPresetPreview(selectedLayoutResolved().layout, preset).next, true)
    },
    saveLayoutPreset(value: string) {
      void load()
      const name = normalizePresetName(value)

      if (
        Object.keys(layoutPresets()).some((candidate) => candidate.toLocaleLowerCase() === name.toLocaleLowerCase())
      ) {
        throw new Error('A preset with this name already exists')
      }

      if (Object.keys(layoutPresets()).length >= 50) throw new Error('You can save at most 50 layout presets')

      const layout = currentLayoutPreset()

      persistLayoutPresets({ ...layoutPresets(), [name]: layout }, { name, layout })

      return name
    },
    updateLayoutPreset(name: string) {
      if (!layoutPresets()[name]) return false

      const layout = currentLayoutPreset()

      persistLayoutPresets({ ...layoutPresets(), [name]: layout }, { name, layout })

      return true
    },
    renameLayoutPreset(current: string, value: string) {
      const name = normalizePresetName(value)
      const preset = layoutPresets()[current]

      if (!preset) throw new Error('Layout preset no longer exists')

      if (
        name.toLocaleLowerCase() !== current.toLocaleLowerCase() &&
        Object.keys(layoutPresets()).some((candidate) => candidate.toLocaleLowerCase() === name.toLocaleLowerCase())
      ) {
        throw new Error('A preset with this name already exists')
      }

      const next = { ...layoutPresets() }

      delete next[current]
      next[name] = preset
      persistLayoutPresets(next, { name, layout: preset, previousName: current })

      return name
    },
    deleteLayoutPreset(name: string) {
      if (!layoutPresets()[name]) return false

      const next = { ...layoutPresets() }

      delete next[name]
      persistLayoutPresets(next, { name })

      return true
    },
    saveMcpPreset(value: string, states: Record<string, DesiredMcpState>) {
      requireHydration()

      if (Object.keys(states).length === 0) throw new Error('There are no MCP servers to save')

      const name = normalizePresetName(value)

      if (Object.keys(mcpPresets()).some((candidate) => candidate.toLocaleLowerCase() === name.toLocaleLowerCase())) {
        throw new Error('A preset with this name already exists')
      }

      if (Object.keys(mcpPresets()).length >= 50) throw new Error('You can save at most 50 MCP presets')

      const preset = { ...states }

      persistMcpPresets({ ...mcpPresets(), [name]: preset }, { operation: 'save', name, states: preset })

      return name
    },
    updateMcpPreset(name: string, states: Record<string, DesiredMcpState>) {
      requireHydration()

      if (!mcpPresets()[name]) return false

      if (Object.keys(states).length === 0) throw new Error('There are no MCP servers to save')

      const preset = { ...states }

      persistMcpPresets({ ...mcpPresets(), [name]: preset }, { operation: 'update', name, states: preset })

      return true
    },
    renameMcpPreset(current: string, value: string) {
      requireHydration()
      const name = normalizePresetName(value)
      const preset = mcpPresets()[current]

      if (!preset) throw new Error('MCP preset no longer exists')

      if (
        name.toLocaleLowerCase() !== current.toLocaleLowerCase() &&
        Object.keys(mcpPresets()).some((candidate) => candidate.toLocaleLowerCase() === name.toLocaleLowerCase())
      ) {
        throw new Error('A preset with this name already exists')
      }

      const next = { ...mcpPresets() }

      delete next[current]
      next[name] = preset
      persistMcpPresets(next, { operation: 'rename', name, previousName: current })

      return name
    },
    deleteMcpPreset(name: string) {
      requireHydration()

      if (!mcpPresets()[name]) return false

      const next = { ...mcpPresets() }

      delete next[name]
      persistMcpPresets(next, { operation: 'delete', name })

      return true
    },
    async saveLayoutAsDefault() {
      await load()
      const target = selectedTarget()
      const layout = resolveTarget(target).layout

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
      setKey(value, 'toggleKey')
    },
    setFocusKey(value: string) {
      setKey(value, 'focusKey')
    },
    setSearchKey(value: string) {
      setKey(value, 'searchKey')
    },
    toggleMcpPersistence() {
      void load()
      update({ target: selectedTarget(), behavior: { persistMcp: !selectedResolved().behavior.persistMcp } })
    },
    toggleCornerFont() {
      void load()
      update({ target: selectedTarget(), behavior: { cornerFont: !selectedResolved().behavior.cornerFont } })
    },
    toggleLspIconStyle() {
      void load()
      update({
        target: selectedTarget(),
        behavior: { lspIconStyle: selectedResolved().behavior.lspIconStyle === 'nerd' ? 'text' : 'nerd' },
      })
    },
    toggleRowDensity() {
      void load()
      update({
        target: selectedTarget(),
        behavior: { rowDensity: selectedResolved().behavior.rowDensity === 'compact' ? 'comfortable' : 'compact' },
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
    shouldConfirmSkill(skill: PreferenceSkill) {
      void load()

      return !skippedSkills().has(skillKey(skill))
    },
    skipSkillConfirmation(skill: PreferenceSkill) {
      void load()
      const next = new Set(skippedSkills())

      next.add(skillKey(skill))
      setSkippedSkills(next)
      update({ user: { skillConfirmation: { location: skillKey(skill), skipped: true } } })
    },
    revokeSkillConfirmation(location: string) {
      void load()

      if (!location) return

      const next = new Set(skippedSkills())

      next.delete(location)
      setSkippedSkills(next)
      update({ user: { skillConfirmation: { location, skipped: false } } })
    },
    resetSkillConfirmations() {
      void load()
      setSkippedSkills(new Set<string>())
      update({ user: { clearSkillConfirmations: true } })
    },
    isFavoriteSkill(skill: PreferenceSkill) {
      void load()

      return favoriteSkills().has(skillKey(skill))
    },
    toggleFavoriteSkill,
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
    setDesiredMcpStates(scope: string, states: Record<string, DesiredMcpState>) {
      void load()
      update({ target: targetForScope(scope), mcp: { states } })
    },
  }
}

export type PreferencesController = ReturnType<typeof createPreferencesController>
