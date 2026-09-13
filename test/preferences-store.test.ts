import { expect, test } from "bun:test"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createSectionPreferencesStore } from "../src/preferences-store"
import type { SectionVisibility } from "../src/state"

const defaults: SectionVisibility = {
  todo: true,
  subagents: true,
  skills: true,
  quick_actions: true,
  lsp: true,
  mcp: true,
}

test("migrates legacy visibility once and ignores stale KV after reset", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-store-"))
  try {
    const store = createSectionPreferencesStore(directory)
    expect((await store.load({ lsp: false })).sections).toEqual({ lsp: false })

    await store.update({ reset: true }, defaults)
    await store.flush()

    const restarted = createSectionPreferencesStore(directory)
    expect((await restarted.load({ lsp: false })).sections).toEqual({})
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("preserves concurrent updates from independent store instances", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-store-"))
  try {
    const first = createSectionPreferencesStore(directory)
    const second = createSectionPreferencesStore(directory)
    await first.load({ lsp: false })

    await Promise.all([
      first.update({ values: { lsp: true } }, defaults),
      second.update({ values: { todo: false } }, defaults),
    ])
    await Promise.all([first.flush(), second.flush()])

    const restarted = createSectionPreferencesStore(directory)
    expect((await restarted.load({ lsp: false, quick_actions: false })).sections).toEqual({ todo: false })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("merges an early write with legacy preferences during later migration", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-store-"))
  try {
    const store = createSectionPreferencesStore(directory)
    await store.update({ values: { todo: false } }, defaults)
    await store.flush()

    expect((await store.load({ lsp: false })).sections).toEqual({ lsp: false, todo: false })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("recovers a lock left by a terminated process", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-store-"))
  const preferencesDirectory = join(directory, "opencode-pretty-sidebar")
  try {
    await mkdir(preferencesDirectory)
    await writeFile(
      join(preferencesDirectory, "preferences.lock"),
      JSON.stringify({ token: "stale", pid: 2_147_483_647 }),
    )

    const store = createSectionPreferencesStore(directory)
    expect((await store.load({ lsp: false })).sections).toEqual({ lsp: false })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("stores visibility and expansion together as the default layout", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-store-"))
  const layout = {
    sections: { ...defaults, skills: false },
    expanded: { ...defaults, todo: false, skills: true },
  }
  try {
    const store = createSectionPreferencesStore(directory)
    await store.load({ lsp: false })
    await store.update({ reset: true, layout }, defaults)
    await store.flush()

    const restarted = createSectionPreferencesStore(directory)
    expect((await restarted.load({ lsp: false })).layout).toEqual(layout)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("does not overwrite preferences written by a newer schema", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-store-"))
  const preferencesDirectory = join(directory, "opencode-pretty-sidebar")
  const preferencesFile = join(preferencesDirectory, "preferences.json")
  const future = '{"version":2,"sections":{"lsp":true}}\n'
  try {
    await mkdir(preferencesDirectory)
    await writeFile(preferencesFile, future)

    const store = createSectionPreferencesStore(directory)
    await expect(store.load({ lsp: false })).rejects.toThrow("Unsupported preferences version: 2")
    expect(await readFile(preferencesFile, "utf8")).toBe(future)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
