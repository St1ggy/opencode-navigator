import { expect, test } from "bun:test"
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createPreferencesStore } from "../src/preferences-store"
import type { SectionVisibility, SidebarSection } from "../src/state"

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

test("stores and clears user layout presets", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-store-"))
  const layout = {
    sections: { ...defaults, skills: false },
    expanded: { ...defaults, todo: false },
    order: ["mcp", "todo", "subagents", "skills", "quick_actions", "lsp"] as SidebarSection[],
  }
  try {
    const store = createPreferencesStore(directory)
    await store.update({ user: { layoutPresets: { Focus: layout } } })
    await store.flush()
    expect((await createPreferencesStore(directory).load()).user.layoutPresets).toEqual({ Focus: layout })

    await store.update({ user: { layoutPresets: {} } })
    await store.flush()
    expect((await createPreferencesStore(directory).load()).user.layoutPresets).toBeUndefined()
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

test("preserves concurrent preset saves from independent store instances", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-store-"))
  const layout = {
    sections: defaults,
    expanded: defaults,
    order: ["todo", "subagents", "skills", "quick_actions", "lsp", "mcp"] as SidebarSection[],
  }
  try {
    const first = createPreferencesStore(directory)
    const second = createPreferencesStore(directory)
    await Promise.all([
      first.update({ user: { layoutPreset: { name: "Focus", layout } } }),
      second.update({ user: { layoutPreset: { name: "Review", layout } } }),
    ])
    await Promise.all([first.flush(), second.flush()])

    expect(Object.keys((await createPreferencesStore(directory).load()).user.layoutPresets ?? {})).toEqual([
      "Focus",
      "Review",
    ])
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

test("recovers a stale lock after a recovery owner also terminates", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-store-"))
  const preferencesDirectory = join(directory, "opencode-pretty-sidebar")
  try {
    await mkdir(preferencesDirectory)
    await writeFile(
      join(preferencesDirectory, "preferences.lock"),
      JSON.stringify({ token: "stale", pid: 2_147_483_647 }),
    )
    await writeFile(
      join(preferencesDirectory, "preferences.lock.recover.c3RhbGU.0000000000000.2147483647.abandoned"),
      JSON.stringify({ token: "stale", pid: 2_147_483_647 }),
    )

    const [first, second] = await Promise.all([
      createPreferencesStore(directory).load(),
      createPreferencesStore(directory).load(),
    ])
    expect(first).toEqual({ global: {}, worktrees: {}, user: {} })
    expect(second).toEqual(first)
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

test("stores and resets every preference group independently per worktree", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-store-"))
  const target = { kind: "worktree" as const, key: "/repo" }
  try {
    const store = createPreferencesStore(directory)
    await store.update({ target, behavior: { focusKey: "alt+w" } })
    await store.update({
      target,
      layout: {
        sections: { ...defaults, mcp: false },
        expanded: defaults,
        order: ["mcp", "todo", "subagents", "skills", "quick_actions", "lsp"],
      },
    })
    await store.update({ target, mcp: { states: { wiki: "disabled", tracker: "enabled" } } })
    await store.flush()

    expect((await store.load()).worktrees["/repo"]).toMatchObject({
      behavior: { focusKey: "alt+w" },
      layout: { sections: { mcp: false }, order: ["mcp", "todo", "subagents", "skills", "quick_actions", "lsp"] },
      mcp: { tracker: "enabled", wiki: "disabled" },
    })

    await store.update({ target, clearLayout: true, clearBehavior: true, clearMcp: true })
    await store.flush()
    expect((await store.load()).worktrees["/repo"]).toBeUndefined()
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
