import { expect, test } from "bun:test"
import { pluginConfig } from "../src/config"

test("parses focus_key and supplies its built-in default", () => {
  expect(pluginConfig(undefined).focusKey).toBe("ctrl+shift+f")
  expect(pluginConfig({ focus_key: " alt+f " }).focusKey).toBe("alt+f")
  expect(pluginConfig({ focus_key: " " }).focusKey).toBe("ctrl+shift+f")
})
