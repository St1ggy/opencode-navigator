import type { SidebarTodo } from "./controllers/todo"

export type TodoViewMode = "all" | "active" | "finished"

export function buildTodoView(todos: ReadonlyArray<SidebarTodo>, mode: TodoViewMode) {
  const active = todos
    .filter((item) => item.status === "in_progress")
    .concat(todos.filter((item) => item.status === "pending"))
  const completed = todos.filter((item) => item.status === "completed")
  const cancelled = todos.filter((item) => item.status === "cancelled")
  const other = todos.filter((item) => !["in_progress", "pending", "completed", "cancelled"].includes(item.status))
  const groups = [
    { title: "Active", items: mode !== "finished" ? active : [] },
    { title: "Completed", items: mode !== "active" ? completed : [] },
    { title: "Cancelled", items: mode !== "active" ? cancelled : [] },
    { title: "Other", items: mode === "all" ? other : [] },
  ].filter((group) => group.items.length)
  return {
    groups,
    rows: groups.flatMap((group) => group.items.map((item) => ({ item, group: group.title }))),
    counts: {
      all: todos.length,
      active: active.length,
      finished: completed.length + cancelled.length,
      completed: completed.length,
    },
  }
}
