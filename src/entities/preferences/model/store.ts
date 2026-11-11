import { randomUUID } from 'node:crypto'
import { link, mkdir, readFile, readdir, rename, rm, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { LEGACY_PLUGIN_ID } from '../../../shared/config'

import { applyPreferencesUpdate } from './reducer'
import { type PreferencesDocument, emptyPreferencesDocument, parsePreferencesDocument } from './schema'

import type { PreferencesStore, PreferencesUpdate } from './updates'

export { applyPreferencesUpdate } from './reducer'
export type { PreferenceTarget, PreferencesStore, PreferencesUpdate } from './updates'

type LockOwner = {
  token: string
  pid: number
}

const LOCK_TIMEOUT_MS = 3000

function errno(error: unknown, code: string) {
  return error instanceof Error && 'code' in error && error.code === code
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
}

export function createPreferencesStore(stateDirectory: string): PreferencesStore {
  // Keep the established directory and lock shared with earlier releases.
  const directory = join(stateDirectory, LEGACY_PLUGIN_ID)
  const file = join(directory, 'preferences.json')
  const lock = join(directory, 'preferences.lock')
  let writes = Promise.resolve()

  async function readLockOwner(): Promise<LockOwner | undefined> {
    const source = await readFile(lock, 'utf8').catch((error) => {
      if (errno(error, 'ENOENT')) return

      throw error
    })

    if (source === undefined) return

    try {
      const value = JSON.parse(source) as Record<string, unknown>

      if (typeof value.token !== 'string' || typeof value.pid !== 'number') return

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
      return !errno(error, 'ESRCH')
    }
  }

  async function moveLockToTombstone(suffix: string) {
    const tombstone = `${lock}.${suffix}.${randomUUID()}`

    try {
      await rename(lock, tombstone)
    } catch (error) {
      if (errno(error, 'ENOENT')) return false

      throw error
    }
    await rm(tombstone, { recursive: true, force: true })

    return true
  }

  async function liveRecoveryMarkers(prefix = 'preferences.lock.recover.') {
    const entries = await readdir(directory)
    const markers: string[] = []

    for (const entry of entries) {
      if (!entry.startsWith(prefix) || entry.endsWith('.candidate')) continue

      const path = join(directory, entry)
      const markerOwner = await readFile(path, 'utf8')
        .then((source) => JSON.parse(source) as Partial<LockOwner>)
        .catch(() => {})

      if (typeof markerOwner?.pid === 'number' && processIsAlive(markerOwner.pid)) markers.push(path)
      else
        await unlink(path).catch((error) => {
          if (!errno(error, 'ENOENT')) throw error
        })
    }

    return markers.sort()
  }

  async function reapStaleLock(owner: LockOwner) {
    const token = Buffer.from(owner.token).toString('base64url')
    const prefix = `preferences.lock.recover.${token}.`
    const recovery = join(
      directory,
      `${prefix}${Date.now().toString().padStart(13, '0')}.${process.pid}.${randomUUID()}`,
    )
    const markers = await liveRecoveryMarkers(prefix)

    if (markers.length > 0) return false

    const candidate = `${recovery}.candidate`

    await writeFile(candidate, JSON.stringify({ token: owner.token, pid: process.pid }), { flag: 'wx', mode: 0o600 })
    try {
      await rename(candidate, recovery)
      await delay(10)

      const liveMarkers = await liveRecoveryMarkers(prefix)

      if (liveMarkers[0] !== recovery) return false

      const current = await readLockOwner()

      if (current?.token !== owner.token || processIsAlive(current.pid)) return false

      return moveLockToTombstone('stale')
    } finally {
      await unlink(candidate).catch((error) => {
        if (!errno(error, 'ENOENT')) throw error
      })
      await unlink(recovery).catch((error) => {
        if (!errno(error, 'ENOENT')) throw error
      })
    }
  }

  async function tryAcquireLock(deadline: number) {
    const token = randomUUID()
    const candidate = `${lock}.${token}.candidate`
    let acquired = false
    let handedOff = false

    await writeFile(candidate, JSON.stringify({ token, pid: process.pid }), { flag: 'wx', mode: 0o600 })
    try {
      try {
        await link(candidate, lock)
        acquired = true
      } catch (error) {
        if (!errno(error, 'EEXIST')) throw error

        const owner = await readLockOwner()

        if (!owner || processIsAlive(owner.pid)) return

        await reapStaleLock(owner)

        return
      }

      while (true) {
        const markers = await liveRecoveryMarkers()

        if (markers.length === 0) break

        if (Date.now() >= deadline) return

        await delay(10)
      }
      const currentOwner = await readLockOwner()

      if (currentOwner?.token !== token) return

      handedOff = true

      return async () => {
        const current = await readLockOwner()

        if (current?.token !== token) throw new Error('Refusing to release a preferences lock owned by another process')

        await moveLockToTombstone('released')
      }
    } finally {
      if (acquired && !handedOff) {
        const current = await readLockOwner()

        if (current?.token === token) await moveLockToTombstone('released')
      }

      await unlink(candidate).catch((error) => {
        if (!errno(error, 'ENOENT')) throw error
      })
    }
  }

  async function acquireLock() {
    await mkdir(directory, { recursive: true, mode: 0o700 })
    const deadline = Date.now() + LOCK_TIMEOUT_MS

    while (true) {
      const release = await tryAcquireLock(deadline)

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
    const source = await readFile(file, 'utf8').catch((error) => {
      if (errno(error, 'ENOENT')) return

      throw error
    })

    if (source === undefined) return

    try {
      return parsePreferencesDocument(JSON.parse(source))
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error(`Malformed preferences JSON: ${file}`, { cause: error })

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
        if (!errno(error, 'ENOENT')) throw error
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

export type { PluginSettings, SectionLayoutDefault } from './schema'
