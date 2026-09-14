import { expect, test } from "bun:test"
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createPreferencesStore } from "../src/preferences-store"
import type { SectionVisibility } from "../src/state"

const defaults: SectionVisibility = {
  todo: true,
  subagents: true,
  skills: true,
  quick_actions: true,
  lsp: true,
  mcp: true,
}

test("stores and clears the default layout", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-store-"))
  const layout = {
    sections: { ...defaults, skills: false },
    expanded: { ...defaults, todo: false, skills: true },
  }
  try {
    const store = createPreferencesStore(directory)
    await store.update({ layout })
    await store.flush()
    expect((await createPreferencesStore(directory).load()).global.layout).toEqual(layout)

    await store.update({ clearLayout: true })
    await store.flush()
    expect((await createPreferencesStore(directory).load()).global.layout).toBeUndefined()
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("preserves concurrent updates from independent store instances", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-store-"))
  try {
    const first = createPreferencesStore(directory)
    const second = createPreferencesStore(directory)

    await Promise.all([
      first.update({ mcp: { scope: "/one", name: "wiki", state: "disabled" } }),
      second.update({ mcp: { scope: "/two", name: "context7", state: "enabled" } }),
    ])
    await Promise.all([first.flush(), second.flush()])

    expect((await createPreferencesStore(directory).load()).worktrees).toEqual({
      "/one": { mcp: { wiki: "disabled" } },
      "/two": { mcp: { context7: "enabled" } },
    })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("merges an update queued before the initial load", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-store-"))
  try {
    const store = createPreferencesStore(directory)
    await store.update({ behavior: { toggleKey: "alt+s" } })
    await store.flush()

    expect((await store.load()).global.behavior).toEqual({ toggleKey: "alt+s" })
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

    const store = createPreferencesStore(directory)
    expect(await store.load()).toEqual({ global: {}, worktrees: {}, user: {} })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("stores and resets behavior overrides", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-store-"))
  try {
    const store = createPreferencesStore(directory)
    await store.update({
      behavior: {
        toggleKey: "alt+s",
        focusKey: "alt+f",
        persistMcp: false,
        lspIconStyle: "text",
      },
    })
    await store.flush()

    expect((await createPreferencesStore(directory).load()).global.behavior).toEqual({
      toggleKey: "alt+s",
      focusKey: "alt+f",
      persistMcp: false,
      lspIconStyle: "text",
    })

    await store.update({ clearBehavior: true })
    await store.flush()
    expect((await createPreferencesStore(directory).load()).global.behavior).toBeUndefined()
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("persists all preference groups in one sanitized document", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-store-"))
  const preferencesDirectory = join(directory, "opencode-pretty-sidebar")
  const preferencesFile = join(preferencesDirectory, "preferences.json")
  try {
    const store = createPreferencesStore(directory)
    await store.update({ layout: { sections: { skills: false }, expanded: { todo: false } } })
    await store.update({ behavior: { toggleKey: " alt+s ", focusKey: "alt+f" } })
    await store.update({ mcp: { scope: "/repo", name: "wiki", state: "disabled" } })
    await store.update({ user: { skippedSkillConfirmations: ["/skills/review"], onboardingCompleted: true } })
    await store.flush()

    expect(JSON.parse(await readFile(preferencesFile, "utf8"))).toEqual({
      global: {
        behavior: { toggleKey: "alt+s", focusKey: "alt+f" },
        layout: { sections: { skills: false }, expanded: { todo: false } },
      },
      worktrees: { "/repo": { mcp: { wiki: "disabled" } } },
      user: { skippedSkillConfirmations: ["/skills/review"], onboardingCompleted: true },
    })
    expect((await stat(preferencesFile)).mode & 0o777).toBe(0o600)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("refuses to overwrite malformed preferences JSON", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-store-"))
  const preferencesDirectory = join(directory, "opencode-pretty-sidebar")
  const preferencesFile = join(preferencesDirectory, "preferences.json")
  const malformed = '{"global":'
  try {
    await mkdir(preferencesDirectory)
    await writeFile(preferencesFile, malformed)
    const store = createPreferencesStore(directory)
    await expect(store.load()).rejects.toThrow("Malformed preferences JSON")
    await expect(store.update({ behavior: { toggleKey: "alt+s" } })).rejects.toThrow("Malformed preferences JSON")
    expect(await readFile(preferencesFile, "utf8")).toBe(malformed)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
