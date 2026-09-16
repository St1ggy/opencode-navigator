import { expect, test } from "bun:test"
import { buildTodoView } from "../src/todo-view"

test("Todo groups retain duplicates, order active work first, and keep cancelled separate", () => {
  const todos = [
    { content: "same", status: "pending" },
    { content: "done", status: "completed" },
    { content: "same", status: "in_progress" },
    { content: "stopped", status: "cancelled" },
    { content: "future", status: "unknown" },
    { content: "same", status: "pending" },
  ]
  const all = buildTodoView(todos, "all")
  expect(all.groups.map((group) => group.title)).toEqual(["Active", "Completed", "Cancelled", "Other"])
  expect(all.rows.map((row) => row.item.status)).toEqual([
    "in_progress",
    "pending",
    "pending",
    "completed",
    "cancelled",
    "unknown",
  ])
  expect(all.counts).toEqual({ all: 6, active: 3, finished: 2, completed: 1 })
  expect(buildTodoView(todos, "active").groups.map((group) => group.title)).toEqual(["Active"])
  expect(buildTodoView(todos, "finished").groups.map((group) => group.title)).toEqual(["Completed", "Cancelled"])
  expect(buildTodoView([], "all").rows).toEqual([])
})
