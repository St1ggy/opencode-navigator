export type SidebarTodo = { content: string; status: string; priority?: string }

export type TodoTarget = {
  key: string
  sessionID: string
  routing: { directory: string; workspace?: string }
}

export type TodoSource = {
  list(sessionID: string): readonly SidebarTodo[]
  refresh(sessionID: string, signal: AbortSignal): Promise<readonly SidebarTodo[]>
  subscribe?(listener: (sessionID: string, todos: readonly SidebarTodo[]) => void): () => void
}
