export type CodexRpcClient = {
  request<Result>(method: string, params?: unknown, signal?: AbortSignal): Promise<Result>
  dispose(): void
}
