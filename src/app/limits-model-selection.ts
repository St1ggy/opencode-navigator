import type { LimitsModelSelection, SelectedModel } from '../entities/provider-limit'
import type { Plugin } from '@opencode/plugin/tui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

const commandName = (kind: 'model' | 'variant') => (kind === 'model' ? 'model.list' : 'variant.list')

export function createLimitsModelSelection(
  api: TuiPluginApi,
  current: () => SelectedModel | undefined,
  context?: Plugin.Context,
): LimitsModelSelection {
  const sameTarget = (model: SelectedModel) => {
    const active = current()

    return (
      active?.sessionID === model.sessionID &&
      active.providerID === model.providerID &&
      active.modelID === model.modelID
    )
  }
  const legacy = (model: SelectedModel) => api.state.provider?.find((provider) => provider.id === model.providerID)
  const variants = (model: SelectedModel) =>
    context
      ? (context.ui.model.variant?.list?.() ?? [])
      : Object.keys(legacy(model)?.models[model.modelID]?.variants ?? {})
  const canOpen = (kind: 'model' | 'variant', model: SelectedModel) => {
    const command = api.keymap.getCommands().find((entry) => entry.name === commandName(kind))
    const enabled = typeof command?.enabled === 'function' ? command.enabled() : command?.enabled !== false

    return Boolean(command && enabled && sameTarget(model) && (kind === 'model' || variants(model).length > 0))
  }

  return {
    names(model) {
      if (context) {
        const location = context.location ?? context.data.location.default()
        const provider = context.data.location.provider
          ?.list?.(location)
          ?.find((entry) => entry.id === model.providerID)
        const item = context.data.location.model
          ?.list?.(location)
          ?.find((entry) => entry.providerID === model.providerID && entry.id === model.modelID)

        return { provider: provider?.name ?? model.providerID, model: item?.name ?? model.modelID }
      }

      const provider = legacy(model)

      return {
        provider: provider?.name ?? model.providerID,
        model: provider?.models[model.modelID]?.name ?? model.modelID,
      }
    },
    variants,
    canOpen,
    open(kind, model) {
      if (!canOpen(kind, model)) return false

      return api.keymap.dispatchCommand(commandName(kind)).ok
    },
  }
}
