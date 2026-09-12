import { expect, test } from "bun:test"
import { lspIcon } from "../src/tui"

test("maps common LSP server IDs to compact badges", () => {
  expect(lspIcon("typescript")).toBe("TS")
  expect(lspIcon("pyright")).toBe("Py")
  expect(lspIcon("rust-analyzer")).toBe("Rs")
  expect(lspIcon("lua-language-server")).toBe("Lua")
  expect(lspIcon("custom-server")).toBe("◇")
})
