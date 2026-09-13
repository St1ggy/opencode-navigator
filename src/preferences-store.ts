import { randomUUID } from "node:crypto"
import { link, mkdir, readFile, rename, rm, unlink, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { SIDEBAR_SECTIONS, type SectionVisibility } from "./state"

type StoredPreferences = {
  version: 1
  migrated: boolean
  resetLegacy?: true
  sections: Partial<SectionVisibility>
  layout?: SectionLayoutDefault
}

type LockOwner = {
  token: string
  pid: number
}

export type SectionPreferencesUpdate = {
  reset?: boolean
  values?: Partial<SectionVisibility>
  layout?: SectionLayoutDefault
}

export type SectionLayoutDefault = {
  sections: Partial<SectionVisibility>
  expanded: Partial<SectionVisibility>
}

const LOCK_TIMEOUT_MS = 3_000

function errno(error: unknown, code: string) {
  return error instanceof Error && "code" in error && error.code === code
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
}

function sectionsFrom(value: unknown): Partial<SectionVisibility> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const input = value as Record<string, unknown>
  return Object.fromEntries(
    SIDEBAR_SECTIONS.flatMap((name) => (typeof input[name] === "boolean" ? [[name, input[name]]] : [])),
  ) as Partial<SectionVisibility>
}

function preferencesFrom(value: unknown): StoredPreferences | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return
  const input = value as Record<string, unknown>
  if (input.version !== 1) throw new Error(`Unsupported preferences version: ${String(input.version)}`)
  const layout =
    input.layout && typeof input.layout === "object" && !Array.isArray(input.layout)
      ? (input.layout as Record<string, unknown>)
      : undefined
  return {
    version: 1,
    migrated: input.migrated === true,
    ...(input.resetLegacy === true ? { resetLegacy: true } : {}),
    sections: sectionsFrom(input.sections),
    ...(layout
      ? { layout: { sections: sectionsFrom(layout.sections), expanded: sectionsFrom(layout.expanded) } }
      : {}),
  }
}

export function createSectionPreferencesStore(stateDirectory: string) {
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
        await moveLockToTombstone("stale")
        return
      }

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

  async function read(): Promise<StoredPreferences | undefined> {
    const source = await readFile(file, "utf8").catch((error) => {
      if (errno(error, "ENOENT")) return
      throw error
    })
    if (source === undefined) return
    let parsed: unknown
    try {
      parsed = JSON.parse(source)
    } catch {
      return
    }
    return preferencesFrom(parsed)
  }

  async function write(value: StoredPreferences) {
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
    async load(legacy: unknown) {
      return withLock(async () => {
        const current = await read()
        if (current?.migrated) return current

        const sections = {
          ...(current?.resetLegacy ? {} : sectionsFrom(legacy)),
          ...current?.sections,
        }
        const next = {
          version: 1 as const,
          migrated: true,
          sections,
          ...(current?.layout ? { layout: current.layout } : {}),
        }
        await write(next)
        return next
      })
    },
    update(update: SectionPreferencesUpdate, defaults: SectionVisibility) {
      return enqueue(() =>
        withLock(async () => {
          const current = (await read()) ?? { version: 1 as const, migrated: false, sections: {} }
          const sections = update.reset ? {} : { ...current.sections }
          for (const name of SIDEBAR_SECTIONS) {
            const visible = update.values?.[name]
            if (visible === undefined) continue
            if (current.migrated && visible === defaults[name]) delete sections[name]
            else sections[name] = visible
          }
          await write({
            version: 1,
            migrated: current.migrated,
            ...((update.reset && !current.migrated) || current.resetLegacy ? { resetLegacy: true } : {}),
            sections,
            ...(update.layout || current.layout ? { layout: update.layout ?? current.layout } : {}),
          })
        }),
      )
    },
    async flush() {
      await writes
    },
  }
}

export type SectionPreferencesStore = ReturnType<typeof createSectionPreferencesStore>
