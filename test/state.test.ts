import { describe, expect, test } from "bun:test"
import {
  disabledMcpNames,
  mcpScope,
  mcpToggleAction,
  parseMcpPreferences,
  setMcpDisabled,
} from "../src/state"

describe("MCP preferences", () => {
  test("uses the worktree as the persistence scope", () => {
    expect(mcpScope({ worktree: "/repo", directory: "/repo/packages/app" })).toBe("/repo")
    expect(mcpScope({ directory: "/tmp/project" })).toBe("/tmp/project")
    expect(mcpScope({})).toBe("global")
  })

  test("stores sorted unique names per scope", () => {
    let value: unknown
    value = setMcpDisabled(value, "/repo", "wiki", true)
    value = setMcpDisabled(value, "/repo", "context7", true)
    value = setMcpDisabled(value, "/repo", "wiki", true)

    expect(parseMcpPreferences(value)).toEqual({
      version: 1,
      disabledByScope: { "/repo": ["context7", "wiki"] },
    })
  })

  test("removes empty scopes", () => {
    const enabled = setMcpDisabled(setMcpDisabled(undefined, "/repo", "wiki", true), "/repo", "wiki", false)
    expect(enabled.disabledByScope).toEqual({})
  })

  test("rejects malformed persisted data", () => {
    expect(disabledMcpNames({ version: 2, disabledByScope: { repo: ["wiki"] } }, "repo")).toEqual(new Set())
    expect(disabledMcpNames({ version: 1, disabledByScope: { repo: ["wiki", 42, "wiki"] } }, "repo")).toEqual(
      new Set(["wiki"]),
    )
  })
})

describe("MCP toggle action", () => {
  test("disconnects connected servers", () => {
    expect(mcpToggleAction("connected")).toBe("disconnect")
  })

  test("connects disabled and recoverable servers", () => {
    expect(mcpToggleAction("disabled")).toBe("connect")
    expect(mcpToggleAction("failed")).toBe("connect")
    expect(mcpToggleAction("needs_auth")).toBe("connect")
  })

  test("ignores pending servers", () => {
    expect(mcpToggleAction("pending")).toBeUndefined()
  })
})
