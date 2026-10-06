import type { SelectedModel } from './types'

export type LimitsModelSelection = {
  names(model: SelectedModel): { provider: string; model: string }
  variants(model: SelectedModel): readonly string[]
  canOpen(kind: 'model' | 'variant', model: SelectedModel): boolean
  open(kind: 'model' | 'variant', model: SelectedModel): boolean
}
