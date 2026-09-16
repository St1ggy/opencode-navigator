import { randomUUID } from "node:crypto"
import { link, mkdir, readFile, readdir, rename, rm, unlink, writeFile } from "node:fs/promises"
import { join } from "node:path"
import {
  emptyPreferencesDocument,
  parseDesiredMcpStates,
  parseLayoutPresets,
  parseMcpPresets,
  parseRecentSkills,
  parsePluginSettings,
  parsePreferencesDocument,
  parseSectionLayout,
  type DesiredMcpState,
  type LayoutPresets,
  type McpPresets,
  type PluginSettings,
  type PreferencesDocument,
  type SectionLayoutDefault,
} from "./preferences-schema"

type LockOwner = {
  token: string
  pid: number
}

export type PreferencesUpdate = {
  target?: PreferenceTarget
  layout?: SectionLayoutDefault
  clearLayout?: boolean
  behavior?: Partial<PluginSettings>
  clearBehavior?: boolean
  user?: {
    skippedSkillConfirmations?: string[]
    onboardingCompleted?: boolean
    layoutPresets?: LayoutPresets
    layoutPreset?: { name: string; layout?: SectionLayoutDefault; previousName?: string }
    mcpPresets?: McpPresets
    mcpPreset?:
      | { operation: "save" | "update"; name: string; states: Record<string, DesiredMcpState> }
      | { operation: "rename"; name: string; previousName: string }
      | { operation: "delete"; name: string }
    favoriteSkills?: string[]
    favoriteSkill?: { location: string; favorite: boolean }
    recentSkill?: string
  }
  mcp?: {
    scope?: string
    name?: string
    state?: DesiredMcpState
    states?: Record<string, DesiredMcpState>
  }
  clearMcp?: boolean
}

export type PreferenceTarget = { kind: "global" } | { kind: "worktree"; key: string }

const LOCK_TIMEOUT_MS = 3_000

function errno(error: unknown, code: string) {
  return error instanceof Error && "code" in error && error.code === code
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
}

function parseSkillConfirmations(value: unknown) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0))].sort()
}

function targetPreferences(document: PreferencesDocument, target: PreferenceTarget) {
  return target.kind === "global" ? document.global : (document.worktrees[target.key] ?? {})
}

function isEmptyScope(value: PreferencesDocument["global"]) {
  return !value.behavior && !value.layout && !value.mcp
}

export function applyPreferencesUpdate(current: PreferencesDocument, update: PreferencesUpdate): PreferencesDocument {
  const target =
    update.target ?? (update.mcp?.scope ? targetForLegacyScope(update.mcp.scope) : { kind: "global" as const })
  const existing = targetPreferences(current, target)
  const behavior = {
    ...(update.clearBehavior ? {} : existing.behavior),
    ...parsePluginSettings(update.behavior),
  }
  const sectionItemLimits = {
    ...(update.clearBehavior ? {} : existing.behavior?.sectionItemLimits),
    ...parsePluginSettings(update.behavior).sectionItemLimits,
  }
  if (Object.keys(sectionItemLimits).length) behavior.sectionItemLimits = sectionItemLimits
  const quickActionVisibility = {
    ...(update.clearBehavior ? {} : existing.behavior?.quickActionVisibility),
    ...parsePluginSettings(update.behavior).quickActionVisibility,
  }
  if (Object.keys(quickActionVisibility).length) behavior.quickActionVisibility = quickActionVisibility
  const mcpUpdate = {
    ...update.mcp?.states,
    ...(update.mcp?.name && update.mcp.state ? { [update.mcp.name]: update.mcp.state } : {}),
  }
  const mcp = parseDesiredMcpStates({
    ...(update.clearMcp ? {} : existing.mcp),
    ...mcpUpdate,
  })
  const scope = {
    ...(Object.keys(behavior).length > 0 ? { behavior } : {}),
    ...(!update.clearLayout && (update.layout || existing.layout)
      ? { layout: parseSectionLayout(update.layout ?? existing.layout) }
      : {}),
    ...(Object.keys(mcp).length > 0 ? { mcp } : {}),
  }
  const worktrees = { ...current.worktrees }
  if (target.kind === "worktree") {
    if (isEmptyScope(scope)) delete worktrees[target.key]
    else worktrees[target.key] = scope
  }
  const skippedSkillConfirmations = update.user?.skippedSkillConfirmations
    ? parseSkillConfirmations(update.user.skippedSkillConfirmations)
    : current.user.skippedSkillConfirmations
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
    const existing = Object.keys(mcpPresets).find((name) => name.toLocaleLowerCase() === requested.toLocaleLowerCase())
    if (mcpPresetUpdate.operation === "save" && requested && !existing && Object.keys(mcpPresets).length < 50) {
      const states = parseDesiredMcpStates(mcpPresetUpdate.states)
      if (Object.keys(states).length > 0) mcpPresets[requested] = states
    }
    if (mcpPresetUpdate.operation === "update" && existing) {
      const states = parseDesiredMcpStates(mcpPresetUpdate.states)
      if (Object.keys(states).length > 0) mcpPresets[existing] = states
    }
    if (mcpPresetUpdate.operation === "rename" && requested) {
      const previous = Object.keys(mcpPresets).find(
        (name) => name.toLocaleLowerCase() === mcpPresetUpdate.previousName.toLocaleLowerCase(),
      )
      if (previous && (!existing || existing === previous)) {
        const states = mcpPresets[previous]
        delete mcpPresets[previous]
        mcpPresets[requested] = states
      }
    }
    if (mcpPresetUpdate.operation === "delete" && existing) delete mcpPresets[existing]
  }
  const parsedMcpPresets = parseMcpPresets(mcpPresets)
  const recentSkills = parseRecentSkills([
    ...(update.user?.recentSkill ? [update.user.recentSkill] : []),
    ...(current.user.recentSkills ?? []),
  ])
  const favoriteSkills = update.user?.favoriteSkills
    ? parseSkillConfirmations(update.user.favoriteSkills)
    : [...(current.user.favoriteSkills ?? [])]
  const favoriteSkill = update.user?.favoriteSkill
  if (favoriteSkill?.location) {
    const index = favoriteSkills.indexOf(favoriteSkill.location)
    if (favoriteSkill.favorite && index < 0) favoriteSkills.push(favoriteSkill.location)
    if (!favoriteSkill.favorite && index >= 0) favoriteSkills.splice(index, 1)
    favoriteSkills.sort()
  }

  return {
    global: target.kind === "global" ? scope : current.global,
    worktrees,
    user: {
      ...(skippedSkillConfirmations ? { skippedSkillConfirmations } : {}),
      ...(typeof update.user?.onboardingCompleted === "boolean"
        ? { onboardingCompleted: update.user.onboardingCompleted }
        : typeof current.user.onboardingCompleted === "boolean"
          ? { onboardingCompleted: current.user.onboardingCompleted }
          : {}),
      ...(Object.keys(parsedLayoutPresets).length > 0 ? { layoutPresets: parsedLayoutPresets } : {}),
      ...(Object.keys(parsedMcpPresets).length > 0 ? { mcpPresets: parsedMcpPresets } : {}),
      ...(favoriteSkills.length > 0 ? { favoriteSkills } : {}),
      ...(recentSkills.length > 0 ? { recentSkills } : {}),
    },
  }
}

function targetForLegacyScope(scope: string): PreferenceTarget {
  return scope === "global" ? { kind: "global" } : { kind: "worktree", key: scope }
}

export function createPreferencesStore(stateDirectory: string) {
  const directory = join(stateDirectory, "opencode-pretty-sidebar")
  const file = join(directory, "preferences.json")
  const lock = join(directory, "preferences.lock")
  let writes = Promise.resolve()

  async function readLockOwner(): Promise<LockOwner | undefined> {
    const source = await readFile(lock, "utf8").catch((error) => {
      if (errno(error, "ENOENT")) return
      throw error
    })
    if (source === undefined) return
    try {
      const value = JSON.parse(source) as Record<string, unknown>
      if (typeof value.token !== "string" || typeof value.pid !== "number") return
      return { token: value.token, pid: value.pid }
    } catch {
      return
    }
  }

  function processIsAlive(pid: number) {
    try {
      process.kill(pid, 0)
      return true
    } catch (error) {
      return !errno(error, "ESRCH")
    }
  }

  async function moveLockToTombstone(suffix: string) {
    const tombstone = `${lock}.${suffix}.${randomUUID()}`
    try {
      await rename(lock, tombstone)
    } catch (error) {
      if (errno(error, "ENOENT")) return false
      throw error
    }
    await rm(tombstone, { recursive: true, force: true })
    return true
  }

  async function liveRecoveryMarkers(prefix = "preferences.lock.recover.") {
    const entries = await readdir(directory)
    const markers: string[] = []
    for (const entry of entries) {
      if (!entry.startsWith(prefix) || entry.endsWith(".candidate")) continue
      const path = join(directory, entry)
      const markerOwner = await readFile(path, "utf8")
        .then((source) => JSON.parse(source) as Partial<LockOwner>)
        .catch(() => undefined)
      if (typeof markerOwner?.pid === "number" && processIsAlive(markerOwner.pid)) markers.push(path)
      else
        await unlink(path).catch((error) => {
          if (!errno(error, "ENOENT")) throw error
        })
    }
    return markers.sort()
  }

  async function reapStaleLock(owner: LockOwner) {
    const token = Buffer.from(owner.token).toString("base64url")
    const prefix = `preferences.lock.recover.${token}.`
    const recovery = join(
      directory,
      `${prefix}${Date.now().toString().padStart(13, "0")}.${process.pid}.${randomUUID()}`,
    )
    const candidate = `${recovery}.candidate`

    if ((await liveRecoveryMarkers(prefix)).length > 0) return false
    await writeFile(candidate, JSON.stringify({ token: owner.token, pid: process.pid }), { flag: "wx", mode: 0o600 })
    try {
      await rename(candidate, recovery)
      await delay(10)
      if ((await liveRecoveryMarkers(prefix))[0] !== recovery) return false
      const current = await readLockOwner()
      if (current?.token !== owner.token || processIsAlive(current.pid)) return false
      return moveLockToTombstone("stale")
    } finally {
      await unlink(candidate).catch((error) => {
        if (!errno(error, "ENOENT")) throw error
      })
      await unlink(recovery).catch((error) => {
        if (!errno(error, "ENOENT")) throw error
      })
    }
  }

  async function tryAcquireLock() {
    const token = randomUUID()
    const candidate = `${lock}.${token}.candidate`
    await writeFile(candidate, JSON.stringify({ token, pid: process.pid }), { flag: "wx", mode: 0o600 })
    try {
      try {
        await link(candidate, lock)
      } catch (error) {
        if (!errno(error, "EEXIST")) throw error
        const owner = await readLockOwner()
        if (!owner || processIsAlive(owner.pid)) return
        await reapStaleLock(owner)
        return
      }

      while ((await liveRecoveryMarkers()).length > 0) await delay(10)
      if ((await readLockOwner())?.token !== token) return

      return async () => {
        const current = await readLockOwner()
        if (current?.token !== token) throw new Error("Refusing to release a preferences lock owned by another process")
        await moveLockToTombstone("released")
      }
    } finally {
      await unlink(candidate).catch((error) => {
        if (!errno(error, "ENOENT")) throw error
      })
    }
  }

  async function acquireLock() {
    await mkdir(directory, { recursive: true, mode: 0o700 })
    const deadline = Date.now() + LOCK_TIMEOUT_MS
    while (true) {
      const release = await tryAcquireLock()
      if (release) return release
      if (Date.now() >= deadline) throw new Error(`Timed out waiting for preferences lock: ${lock}`)
      await delay(10)
    }
  }

  async function withLock<Value>(operation: () => Promise<Value>) {
    const release = await acquireLock()
    try {
      return await operation()
    } finally {
      await release()
    }
  }

  async function read(): Promise<PreferencesDocument | undefined> {
    const source = await readFile(file, "utf8").catch((error) => {
      if (errno(error, "ENOENT")) return
      throw error
    })
    if (source === undefined) return
    try {
      return parsePreferencesDocument(JSON.parse(source))
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error(`Malformed preferences JSON: ${file}`)
      throw error
    }
  }

  async function write(value: PreferencesDocument) {
    const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`
    try {
      await writeFile(temporary, `${JSON.stringify(value)}\n`, { mode: 0o600 })
      await rename(temporary, file)
    } finally {
      await unlink(temporary).catch((error) => {
        if (!errno(error, "ENOENT")) throw error
      })
    }
  }

  function enqueue(operation: () => Promise<void>) {
    const result = writes.then(operation)
    writes = result.catch(() => {})
    return result
  }

  return {
    load() {
      return withLock(async () => (await read()) ?? emptyPreferencesDocument())
    },
    update(update: PreferencesUpdate) {
      return enqueue(() =>
        withLock(async () => {
          const current = (await read()) ?? emptyPreferencesDocument()
          await write(applyPreferencesUpdate(current, update))
        }),
      )
    },
    async flush() {
      await writes
    },
  }
}

export type PreferencesStore = ReturnType<typeof createPreferencesStore>
export type { PluginSettings, SectionLayoutDefault } from "./preferences-schema"
