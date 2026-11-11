import { changeCodexBinding } from './codex-account-bindings'
import { assignGroup } from './group-assignments'
import {
  type McpServerGroups,
  type PreferencesDocument,
  type SkillGroups,
  type WorkspaceProfiles,
  parseCodexAccountBindings,
  parseDesiredMcpStates,
  parseFavoriteQuickActions,
  parseLayoutPresets,
  parseMcpPresets,
  parseMcpServerGroups,
  parsePluginSettings,
  parseRecentQuickActions,
  parseRecentSkills,
  parseSectionLayout,
  parseSkillGroups,
  parseWorkspaceProfiles,
} from './schema'
import { changeToolbarPins } from './toolbar-pins'

import type { PreferenceTarget, PreferencesUpdate } from './updates'

function parseSkillConfirmations(value: unknown) {
  if (!Array.isArray(value)) return []

  return [...new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0))].sort()
}

function targetPreferences(document: PreferencesDocument, target: PreferenceTarget) {
  return target.kind === 'global' ? document.global : (document.worktrees[target.key] ?? {})
}

function isEmptyScope(value: PreferencesDocument['global']) {
  return !value.behavior && !value.layout && !value.mcp
}

function retargetProfileMcp(profiles: WorkspaceProfiles, previous: string, next?: string) {
  for (const layout of Object.keys(profiles)) {
    if (profiles[layout].toLocaleLowerCase() !== previous.toLocaleLowerCase()) continue

    if (next) profiles[layout] = next
    else delete profiles[layout]
  }
}

// Keep the ordered, independent mutations together as one atomic document update.
// oxlint-disable-next-line sonarjs/cognitive-complexity
export function applyPreferencesUpdate(current: PreferencesDocument, update: PreferencesUpdate): PreferencesDocument {
  const target =
    update.target ?? (update.mcp?.scope ? targetForLegacyScope(update.mcp.scope) : { kind: 'global' as const })
  const existing = targetPreferences(current, target)

  if (
    update.expectedScope &&
    update.expectedScope !== JSON.stringify({ layout: existing.layout, mcp: existing.mcp, behavior: existing.behavior })
  ) {
    throw new Error('Settings changed after this preview; reopen the import preview')
  }

  const behavior = {
    ...(!update.clearBehavior && existing.behavior),
    ...parsePluginSettings(update.behavior),
  }
  const sectionItemLimits = {
    ...(!update.clearBehavior && existing.behavior?.sectionItemLimits),
    ...parsePluginSettings(update.behavior).sectionItemLimits,
  }

  if (Object.keys(sectionItemLimits).length > 0) behavior.sectionItemLimits = sectionItemLimits

  const quickActionVisibility = {
    ...(!update.clearBehavior && existing.behavior?.quickActionVisibility),
    ...parsePluginSettings(update.behavior).quickActionVisibility,
  }

  if (Object.keys(quickActionVisibility).length > 0) behavior.quickActionVisibility = quickActionVisibility

  const mcpUpdate = {
    ...update.mcp?.states,
    ...(update.mcp?.name && update.mcp.state && { [update.mcp.name]: update.mcp.state }),
  }
  const mcp = parseDesiredMcpStates({
    ...(!update.clearMcp && existing.mcp),
    ...mcpUpdate,
  })
  const scope = {
    ...(Object.keys(behavior).length > 0 && { behavior }),
    ...((update.layout ?? (!update.clearLayout && existing.layout)) && {
      layout: parseSectionLayout(update.layout ?? existing.layout),
    }),
    ...(Object.keys(mcp).length > 0 && { mcp }),
  }
  const worktrees = { ...current.worktrees }

  if (target.kind === 'worktree') {
    if (isEmptyScope(scope)) delete worktrees[target.key]
    else worktrees[target.key] = scope
  }

  const skippedSkillConfirmations = new Set(
    update.user?.skippedSkillConfirmations
      ? parseSkillConfirmations(update.user.skippedSkillConfirmations)
      : current.user.skippedSkillConfirmations,
  )
  const skillConfirmation = update.user?.skillConfirmation

  if (update.user?.clearSkillConfirmations) skippedSkillConfirmations.clear()

  if (skillConfirmation?.location) {
    if (skillConfirmation.skipped) skippedSkillConfirmations.add(skillConfirmation.location)
    else skippedSkillConfirmations.delete(skillConfirmation.location)
  }

  const layoutPresets = { ...(update.user?.layoutPresets ?? current.user.layoutPresets) }
  const presetUpdate = update.user?.layoutPreset

  if (presetUpdate) {
    if (presetUpdate.previousName) delete layoutPresets[presetUpdate.previousName]

    const name = presetUpdate.name.trim().slice(0, 64)
    const layout = parseSectionLayout(presetUpdate.layout)

    if (name && layout) layoutPresets[name] = layout
    else if (name) delete layoutPresets[name]
  }

  const parsedLayoutPresets = parseLayoutPresets(layoutPresets)
  const mcpPresets = { ...(update.user?.mcpPresets ?? current.user.mcpPresets) }
  const mcpPresetUpdate = update.user?.mcpPreset

  if (mcpPresetUpdate) {
    const requested = mcpPresetUpdate.name.trim().slice(0, 64)
    const existingName = Object.keys(mcpPresets).find(
      (name) => name.toLocaleLowerCase() === requested.toLocaleLowerCase(),
    )

    if (mcpPresetUpdate.operation === 'save' && requested && !existingName && Object.keys(mcpPresets).length < 50) {
      const states = parseDesiredMcpStates(mcpPresetUpdate.states)

      if (Object.keys(states).length > 0) mcpPresets[requested] = states
    }

    if (mcpPresetUpdate.operation === 'update' && existingName) {
      const states = parseDesiredMcpStates(mcpPresetUpdate.states)

      if (Object.keys(states).length > 0) mcpPresets[existingName] = states
    }

    if (mcpPresetUpdate.operation === 'rename' && requested) {
      const previous = Object.keys(mcpPresets).find(
        (name) => name.toLocaleLowerCase() === mcpPresetUpdate.previousName.toLocaleLowerCase(),
      )

      if (previous && (!existingName || existingName === previous)) {
        const states = mcpPresets[previous]

        delete mcpPresets[previous]
        mcpPresets[requested] = states
      }
    }

    if (mcpPresetUpdate.operation === 'delete' && existingName) delete mcpPresets[existingName]
  }

  const parsedMcpPresets = parseMcpPresets(mcpPresets)
  const workspaceProfiles: WorkspaceProfiles = { ...current.user.workspaceProfiles }
  const profileUpdate = update.user?.workspaceProfile

  if (presetUpdate?.previousName && workspaceProfiles[presetUpdate.previousName]) {
    workspaceProfiles[presetUpdate.name] = workspaceProfiles[presetUpdate.previousName]
    delete workspaceProfiles[presetUpdate.previousName]
  } else if (presetUpdate && !presetUpdate.layout) delete workspaceProfiles[presetUpdate.name]

  const renamedMcp =
    mcpPresetUpdate?.operation === 'rename'
      ? Object.keys(parsedMcpPresets).find(
          (name) => name.toLocaleLowerCase() === mcpPresetUpdate.name.trim().toLocaleLowerCase(),
        )
      : undefined

  if (mcpPresetUpdate?.operation === 'rename' && renamedMcp) {
    retargetProfileMcp(workspaceProfiles, mcpPresetUpdate.previousName, renamedMcp)
  } else if (
    mcpPresetUpdate?.operation === 'delete' &&
    Object.keys(parsedMcpPresets).every((name) => name.toLocaleLowerCase() !== mcpPresetUpdate.name.toLocaleLowerCase())
  ) {
    retargetProfileMcp(workspaceProfiles, mcpPresetUpdate.name)
  }

  if (profileUpdate?.layout) {
    const layout = profileUpdate.layout.trim().slice(0, 64)
    const mcpName = profileUpdate.mcp?.trim().slice(0, 64)

    if (layout && mcpName) workspaceProfiles[layout] = mcpName
    else if (layout) delete workspaceProfiles[layout]
  }

  const favoriteMcpServers = new Set(current.user.favoriteMcpServers)
  const mcpFavorite = update.user?.favoriteMcpServer

  if (mcpFavorite?.name) {
    if (mcpFavorite.favorite) favoriteMcpServers.add(mcpFavorite.name)
    else favoriteMcpServers.delete(mcpFavorite.name)
  }

  const favoriteQuickActions = new Set(current.user.favoriteQuickActions)
  const quickActionFavorite = update.user?.favoriteQuickAction

  if (quickActionFavorite) {
    if (quickActionFavorite.favorite) favoriteQuickActions.add(quickActionFavorite.id)
    else favoriteQuickActions.delete(quickActionFavorite.id)
  }

  const recentSkills = parseRecentSkills([
    ...(update.user?.recentSkill ? [update.user.recentSkill] : []),
    ...(current.user.recentSkills ?? []),
  ])
  const recentQuickActions = parseRecentQuickActions([
    ...(update.user?.recentQuickAction ? [update.user.recentQuickAction] : []),
    ...(current.user.recentQuickActions ?? []),
  ])
  const mcpServerGroups: McpServerGroups = assignGroup(
    current.user.mcpServerGroups,
    update.user?.mcpServerGroup?.name,
    update.user?.mcpServerGroup?.group,
  )
  const skillGroups: SkillGroups = assignGroup(
    current.user.skillGroups,
    update.user?.skillGroup?.location,
    update.user?.skillGroup?.group,
  )
  const binding = update.user?.codexAccountBinding
  const legacyBindingKey =
    binding?.providerID && binding.modelID ? JSON.stringify([binding.providerID, binding.modelID]) : undefined
  const codexAccountBindings =
    binding?.providerID && !binding.modelID
      ? changeCodexBinding(current.user.codexAccountBindings, binding, binding.accountID)
      : assignGroup(current.user.codexAccountBindings, legacyBindingKey, binding?.accountID)
  const pendingUpdate = update.user?.pendingResetAttempt
  const currentAttempt = current.user.pendingResetAttempt

  if (pendingUpdate && currentAttempt && currentAttempt.idempotencyKey !== pendingUpdate.idempotencyKey) {
    throw new Error('Another reset attempt is still unresolved')
  }

  if (
    update.user?.clearPendingResetAttempt &&
    currentAttempt?.idempotencyKey !== update.user.clearPendingResetAttempt
  ) {
    throw new Error('Reset attempt changed; refresh before retrying')
  }

  const pendingResetAttempt = update.user?.clearPendingResetAttempt ? undefined : (pendingUpdate ?? currentAttempt)

  const favoriteSkills = update.user?.favoriteSkills
    ? parseSkillConfirmations(update.user.favoriteSkills)
    : [...(current.user.favoriteSkills ?? [])]
  const favoriteSkill = update.user?.favoriteSkill

  if (favoriteSkill?.location) {
    const index = favoriteSkills.indexOf(favoriteSkill.location)

    if (favoriteSkill.favorite && index === -1) favoriteSkills.push(favoriteSkill.location)

    if (!favoriteSkill.favorite && index !== -1) favoriteSkills.splice(index, 1)

    favoriteSkills.sort()
  }

  const onboardingCompleted =
    typeof update.user?.onboardingCompleted === 'boolean'
      ? update.user.onboardingCompleted
      : current.user.onboardingCompleted
  const toolbarPins = update.user?.toolbarPin
    ? changeToolbarPins(current.user.toolbarPins, update.user.toolbarPin)
    : current.user.toolbarPins

  return {
    global: target.kind === 'global' ? scope : current.global,
    worktrees,
    user: {
      ...(skippedSkillConfirmations.size > 0 && {
        skippedSkillConfirmations: [...skippedSkillConfirmations].sort(),
      }),
      ...(typeof onboardingCompleted === 'boolean' && { onboardingCompleted }),
      ...(toolbarPins?.length && { toolbarPins }),
      ...((update.user?.lastNavigatorVersion ?? current.user.lastNavigatorVersion) && {
        lastNavigatorVersion: update.user?.lastNavigatorVersion ?? current.user.lastNavigatorVersion,
      }),
      ...((update.user?.previousNavigatorVersion ?? current.user.previousNavigatorVersion) && {
        previousNavigatorVersion: update.user?.previousNavigatorVersion ?? current.user.previousNavigatorVersion,
      }),
      ...(Object.keys(parsedLayoutPresets).length > 0 && { layoutPresets: parsedLayoutPresets }),
      ...(Object.keys(parsedMcpPresets).length > 0 && { mcpPresets: parsedMcpPresets }),
      ...(Object.keys(workspaceProfiles).length > 0 && {
        workspaceProfiles: parseWorkspaceProfiles(workspaceProfiles),
      }),
      ...(favoriteSkills.length > 0 && { favoriteSkills }),
      ...(favoriteMcpServers.size > 0 && { favoriteMcpServers: [...favoriteMcpServers].sort() }),
      ...(favoriteQuickActions.size > 0 && {
        favoriteQuickActions: parseFavoriteQuickActions([...favoriteQuickActions]),
      }),
      ...(recentSkills.length > 0 && { recentSkills }),
      ...(recentQuickActions.length > 0 && { recentQuickActions }),
      ...(Object.keys(mcpServerGroups).length > 0 && { mcpServerGroups: parseMcpServerGroups(mcpServerGroups) }),
      ...(Object.keys(skillGroups).length > 0 && { skillGroups: parseSkillGroups(skillGroups) }),
      ...(Object.keys(codexAccountBindings).length > 0 && {
        codexAccountBindings: parseCodexAccountBindings(codexAccountBindings),
      }),
      ...(pendingResetAttempt && { pendingResetAttempt }),
      ...(typeof (update.user?.autoApprovePermissions ?? current.user.autoApprovePermissions) === 'boolean' && {
        autoApprovePermissions: update.user?.autoApprovePermissions ?? current.user.autoApprovePermissions,
      }),
    },
  }
}

function targetForLegacyScope(scope: string): PreferenceTarget {
  return scope === 'global' ? { kind: 'global' } : { kind: 'worktree', key: scope }
}
