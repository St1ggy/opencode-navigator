import type { ProviderQuotaSnapshot, QuotaWindow, SelectedModel } from './types'

type Meter = { percent: number; limited: boolean; resetsAt: number }
type Budget = {
  id: string
  limit: number
  spent: number
  scope: 'each' | 'combined'
  per: 'set' | 'model'
  coverage: 'all' | 'models'
  shared: boolean
  resetsAt: number
  models: readonly { providerID: string; modelID: string; spent?: number }[]
}
export type WorkspaceUsage = {
  workspace: { id: string; name?: string }
  go?: { rolling: Meter; weekly: Meter; monthly: Meter }
  budgets: readonly Budget[]
}

export function projectWorkspaceUsage(
  info: WorkspaceUsage,
  model: SelectedModel,
  provider: { id: string; name: string; integrationID?: string },
  costs: readonly { input: number }[] = [],
): ProviderQuotaSnapshot {
  if (!info.workspace.id || provider.id !== model.providerID || provider.integrationID !== 'opencode')
    throw new Error('Workspace usage does not match the active provider')

  let windows: QuotaWindow[] = []

  if (provider.id === 'opencode-go') {
    windows = Object.entries(info.go ?? {}).map(([id, meter]) => {
      if (
        !Number.isFinite(meter.percent) ||
        meter.percent < 0 ||
        meter.percent > 100 ||
        !Number.isFinite(meter.resetsAt)
      )
        throw new Error('Invalid native Go meter')

      return {
        id: `go:${id}`,
        label: id,
        unit: '%',
        kind: 'subscription',
        scope: 'workspace',
        total: 100,
        used: meter.percent,
        remaining: 100 - meter.percent,
        resetsAt: meter.resetsAt,
        limited: meter.limited,
      }
    })
  } else if (!(costs.length > 0 && costs.every((cost) => cost.input === 0))) {
    windows = info.budgets.flatMap((budget) => {
      const entry = budget.models.find((item) => item.providerID === model.providerID && item.modelID === model.modelID)

      if (budget.coverage === 'models' && !entry) return []

      const spent = budget.per === 'model' && entry ? (entry.spent ?? 0) : budget.spent

      if (
        [spent, budget.limit, budget.resetsAt].some((value) => !Number.isFinite(value)) ||
        spent < 0 ||
        budget.limit < 0
      )
        throw new Error('Invalid native Console budget')

      return [
        {
          id: `budget:${budget.id}`,
          label: 'Workspace budget',
          unit: 'USD',
          kind: 'configured_limit' as const,
          scope: 'workspace' as const,
          ...(budget.per === 'model' && entry && { modelID: model.modelID }),
          total: budget.limit,
          used: spent,
          remaining: Math.max(0, budget.limit - spent),
          resetsAt: budget.resetsAt,
          budget: { scope: budget.scope, per: budget.per, shared: budget.shared },
        },
      ]
    })
  }

  return {
    model,
    providerId: provider.id,
    providerName: provider.name,
    workspaceId: info.workspace.id,
    ...(info.workspace.name && { workspaceName: info.workspace.name }),
    fetchedAt: Date.now(),
    availability: 'ready',
    windows,
    ...(windows.length === 0 && {
      message:
        provider.id === 'opencode-go'
          ? 'No Go allowance was reported for this workspace.'
          : 'No workspace budgets apply to this model.',
    }),
  }
}
