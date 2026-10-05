import { createEffect } from 'solid-js'

import { SelectionMenu, type SelectionOption, useDialogs } from '../../../shared/ui'
import { createResetCreditActions } from '../model/reset-credit-actions'

import type { PreferencesController } from '../../../entities/preferences'
import type {
  ProviderQuotaAdapter,
  SelectedModel,
  createProviderLimitsController,
} from '../../../entities/provider-limit'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function ResetCreditDialog(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  controller: ReturnType<typeof createProviderLimitsController>
  adapter: ProviderQuotaAdapter
  model: SelectedModel
}) {
  const dialogs = useDialogs(props.api)
  const key = JSON.stringify(props.model)
  const current = () => JSON.stringify(props.controller.current().model) === key
  const pending = props.preferences.pendingResetAttempt
  const credits = () => props.controller.snapshot()?.bankedResets
  const actions = createResetCreditActions({ ...props, dialogs, current })

  createEffect(() => {
    if (!current()) dialogs.close()
  })

  const options = (): SelectionOption[] => [
    ...(credits()?.credits?.map((credit) => ({
      title: credit.title ?? `Credit ${credit.id}`,
      value: `credit:${credit.id}`,
      icon: 'presets' as const,
      description: [
        credit.status,
        credit.description,
        credit.expiresAt && `expires ${new Date(credit.expiresAt * 1000).toLocaleString()}`,
      ]
        .filter(Boolean)
        .join(' · '),
    })) ?? []),
    ...(credits()?.availableCount && (credits()?.credits?.length ?? 0) < credits()!.availableCount
      ? [
          {
            title: 'Use next available credit',
            value: 'credit:',
            icon: 'presets' as const,
            description: 'Credit details unavailable',
          },
        ]
      : []),
    ...(pending()
      ? [
          {
            title: 'Reconcile pending attempt',
            value: 'retry',
            icon: 'retry' as const,
            description: 'Reuse the previous idempotency key',
          },
        ]
      : []),
    { title: 'Cancel', value: 'cancel', icon: 'close', description: 'No credit is used' },
  ]

  return (
    <SelectionMenu
      api={props.api}
      title={`Banked resets · ${credits()?.availableCount ?? 0} available${actions.busy() ? ' · pending' : ''}`}
      options={options()}
      height={Math.min(18, options().length * 3)}
      onSelect={(option) => {
        if (option.value === 'cancel') dialogs.back()
        else if (option.value === 'retry') void actions.consume(pending()?.creditID)
        else if (option.value.startsWith('credit:'))
          void actions.review(option.value.slice('credit:'.length) || undefined)
      }}
    />
  )
}
