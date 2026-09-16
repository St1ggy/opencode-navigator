/** @jsxImportSource @opentui/solid */
import { expect, test } from "bun:test"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { testRender } from "@opentui/solid"
import { createSignal, Show, type JSX } from "solid-js"
import { SkillsSection } from "../src/components/sections"
import type { PreferencesController } from "../src/controllers/preferences"
import type { SkillController, SkillInfo } from "../src/controllers/skills"
import { SkillDialog } from "../src/dialogs/skill"

test("skill dialog stays compact for short text and scrolls long text above its controls", async () => {
  for (const long of [false, true]) {
    let commands: Array<{ name: string; run: () => void }> = []
    const api = {
      theme: {
        current: {
          text: "#ffffff",
          textMuted: "#888888",
          accent: "#00ffff",
          primary: "#222222",
          selectedListItemText: "#ffffff",
        },
      },
      keymap: {
        registerLayer: (layer: { commands: typeof commands }) => {
          commands = layer.commands
          return () => {}
        },
      },
      ui: { dialog: { clear() {} } },
    } as unknown as TuiPluginApi
    const skill = {
      name: "review",
      content: "",
      location: "/skills/review/SKILL.md",
      description: long
        ? Array.from({ length: 60 }, (_, index) => `Description line ${index}`).join("\n")
        : "Review changes.",
    }
    const setup = await testRender(() => <SkillDialog api={api} skill={skill} onAccept={() => {}} />, {
      width: 60,
      height: long ? 32 : 80,
    })
    try {
      await setup.flush()
      const frame = setup.captureCharFrame()
      expect(frame).toContain("Accept")
      expect(frame).toContain("Cancel")
      expect(frame.trimEnd().split("\n").length).toBeLessThanOrEqual(long ? 24 : 10)
      if (long) {
        expect(frame).not.toContain(skill.location)
        const down = commands.find((command) => command.name.endsWith(".scroll-down"))!
        for (let index = 0; index < 70; index++) down.run()
        await setup.flush()
        expect(setup.captureCharFrame()).toContain(skill.location)
        expect(setup.captureCharFrame()).toContain("Accept")
      } else expect(frame).toContain(skill.location)
    } finally {
      setup.renderer.destroy()
    }
  }
})

test("Skills keep favorites before recent, record only successful uses, and expose source independently", async () => {
  const items = ["alpha", "favorite", "zebra"].map((name) => ({
    name,
    location: `/skills/${name}/SKILL.md`,
    content: "",
    description: "Skill description",
  }))
  const [recent, setRecent] = createSignal([items[2].location])
  const [modal, setModal] = createSignal<() => JSX.Element>()
  let uses = 0
  let fail = false
  const api = {
    theme: {
      current: {
        text: "#ffffff",
        textMuted: "#888888",
        accent: "#00ffff",
        warning: "#ffff00",
        backgroundPanel: "#111111",
      },
    },
    keymap: { registerLayer: () => () => {} },
    ui: {
      toast() {},
      dialog: { replace: (render: () => JSX.Element) => setModal(() => render), clear: () => setModal(undefined) },
    },
  } as unknown as TuiPluginApi
  const controller = {
    target: () => ({ key: "test" }),
    list: () => items,
    state: () => ({ status: "ready" }),
    refresh: async () => items,
    use: async () => {
      uses++
      if (fail) throw new Error("failed")
      return true
    },
  } as unknown as SkillController
  const preferences = {
    expanded: () => ({ skills: true }),
    favoriteSkills: () => new Set([items[1].location]),
    isFavoriteSkill: (item: SkillInfo) => item.location === items[1].location,
    recentSkills: recent,
    shouldConfirmSkill: () => false,
    sectionItemLimit: () => 0,
    recordSkillUse: async (item: SkillInfo) =>
      setRecent([item.location, ...recent().filter((location) => location !== item.location)]),
  } as unknown as PreferencesController
  const setup = await testRender(
    () => (
      <box>
        <SkillsSection api={api} controller={controller} preferences={preferences} />
        <Show when={modal()}>{(render) => render()()}</Show>
      </box>
    ),
    { width: 60, height: 30 },
  )
  async function clickSkill(name: string, details = false) {
    const lines = setup.captureCharFrame().split("\n")
    const row = lines.findIndex((line) => line.includes(name))
    await setup.mockMouse.click(details ? lines[row].lastIndexOf("i") : lines[row].indexOf(name), row)
    await setup.flush()
  }
  try {
    await setup.flush()
    let frame = setup.captureCharFrame()
    expect(frame.indexOf("favorite")).toBeLessThan(frame.indexOf("zebra"))
    expect(frame.indexOf("zebra")).toBeLessThan(frame.indexOf("alpha"))
    await clickSkill("alpha")
    expect(recent()[0]).toBe(items[0].location)
    fail = true
    await clickSkill("zebra")
    expect(recent()[0]).toBe(items[0].location)
    await clickSkill("alpha", true)
    frame = setup.captureCharFrame()
    expect(frame).toContain("Source")
    expect(frame).toContain(items[0].location)
    expect(uses).toBe(2)
  } finally {
    setup.renderer.destroy()
  }
})
