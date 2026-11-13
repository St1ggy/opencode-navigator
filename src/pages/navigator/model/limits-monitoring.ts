import type {
  ProviderAccountSource,
  ProviderLimitsController,
  ProviderQuotaAdapter,
  SelectedModel,
} from '../../../entities/provider-limit/model'

export type LimitsMonitoring = {
  controller: ProviderLimitsController
  codex?: ProviderQuotaAdapter
  accountSource?: ProviderAccountSource
  selected(): SelectedModel | undefined
  label(): string
  providerName?(): string | undefined
  chooseModel(): void
  chooseVariant(): void
}
