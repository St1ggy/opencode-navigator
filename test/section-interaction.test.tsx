/** @jsxImportSource @opentui/solid */
import { expect, test } from "bun:test"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { testRender } from "@opentui/solid"
import { createSignal } from "solid-js"
// @ts-expect-error The package intentionally publishes JavaScript without declarations.
import { Section } from "../dist/tui.js"

test("the built sidebar remains reactive and toggles on mouse down", async () => {
  const api = {
    theme: {
      current: {
        accent: "#ff9e64",
        text: "#c0caf5",
        textMuted: "#a9b1d6",
      },
    },
  } as unknown as TuiPluginApi
  function TestSection() {
    const [open, setOpen] = createSignal(false)
    return (
      <Section api={api} title="SKILLS" summary="3" open={open()} onToggle={() => setOpen((value) => !value)}>
        <text>content</text>
      </Section>
    )
  }

  const setup = await testRender(() => <TestSection />, { width: 30, height: 3 })

  try {
    await setup.renderOnce()
    expect(setup.captureCharFrame()).not.toContain("content")
    await setup.mockMouse.pressDown(1, 0)
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain("content")
  } finally {
    setup.renderer.destroy()
  }
})
