import type { QuickActionId } from '../../../shared/config'
import type { SessionTarget } from '../../../shared/lib/location/identity'

export type QuickActionState = {
  label: string
  available: boolean
  reason?: string
  shortcut?: string
}

export type QuickActionSource = {
  inspect(action: QuickActionId, target: SessionTarget | undefined): QuickActionState
  execute(action: QuickActionId, target: SessionTarget | undefined, signal: AbortSignal): Promise<void>
}
