import { createEffect, createMemo, createSignal, onCleanup } from 'solid-js'

import { SelectionMenu, type SelectionOption, useDialogs } from '../../../shared/ui'
import { createResetCreditActions } from '../model/reset-credit-actions'
import { resetCreditView } from '../model/reset-credit-view'

import { ResetCreditCard } from './reset-credit-card'

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
  const [now, setNow] = createSignal(Date.now())
  const timer = setInterval(() => setNow(Date.now()), 30_000)

  onCleanup(() => clearInterval(timer))

  createEffect(() => {
    if (!current()) dialogs.close()
  })

  const options = createMemo<SelectionOption[]>(() => [
    ...(credits()?.credits?.map((credit) => ({
      title: credit.title ?? `Credit ${credit.id}`,
      value: `credit:${credit.id}`,
      icon: 'presets' as const,
      description: '',
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
  ])

  return (
    <SelectionMenu
      api={props.api}
      title={`Banked resets · ${credits()?.availableCount ?? 0} available${actions.busy() ? ' · pending' : ''}`}
      description="Review a credit first. Nothing is used until you confirm."
      options={options()}
      height={Math.min(24, options().length * 8)}
      adaptive
      renderOption={(option) => {
        const credit = credits()?.credits?.find((item) => option.value === `credit:${item.id}`)

        return (
          credit && (
            <ResetCreditCard
              api={props.api}
              credit={credit}
              now={now()}
              disabled={actions.busy() || Boolean(pending())}
            />
          )
        )
      }}
      onSelect={(option) => {
        if (option.value === 'cancel') dialogs.back()
        else if (!actions.busy()) {
          if (option.value === 'retry') void actions.consume(pending()?.creditID)
          else if (!pending() && option.value.startsWith('credit:')) {
            const id = option.value.slice('credit:'.length) || undefined
            const credit = credits()?.credits?.find((item) => item.id === id)

            if (!credit || resetCreditView(credit, now()).canReview) void actions.review(id)
          }
        }
      }}
    />
  )
}
