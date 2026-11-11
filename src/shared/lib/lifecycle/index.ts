export { createLeasePool } from './lease-pool'

export type Cleanup = () => void | Promise<void>

export type Lifecycle = {
  readonly signal: AbortSignal
  onDispose(cleanup: Cleanup): void
}

export type Notifications = {
  show(input: { title: string; message: string; variant: 'info' | 'success' | 'warning' | 'error' }): void
}
