import type { TuiSidebarMcpItem } from '@opencode-ai/plugin/tui'

export type McpItem = Omit<TuiSidebarMcpItem, 'status'> & {
  status: TuiSidebarMcpItem['status'] | 'pending'
  title?: string
}

export type McpSource = {
  list(target: { routing: { directory?: string; workspace?: string } }): readonly McpItem[]
  refresh(
    target: { routing: { directory?: string; workspace?: string } },
    force: boolean,
    signal: AbortSignal,
  ): Promise<readonly McpItem[]>
}
