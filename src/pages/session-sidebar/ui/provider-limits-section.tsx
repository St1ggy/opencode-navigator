import { Show } from 'solid-js'

import { ProviderSupportDialog, QuotaSnapshotRows, ResetCreditDialog } from '../../../features/provider-limits'
import { PLUGIN_ID } from '../../../shared/config'
import { useDialogs, useIcons } from '../../../shared/ui'

import { CodexAccountControls } from './codex-account-controls'
import { LimitsAction } from './limits-action'
import { LimitsStatus } from './limits-status'
import { Section } from './section'

import type { PreferencesController } from '../../../entities/preferences'
import type { ProviderQuotaAdapter, createProviderLimitsController } from '../../../entities/provider-limit'
import type { ProviderQuotaCapability } from '../../../features/provider-limits'
import type { SidebarInteraction } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function ProviderLimitsSection(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  interaction?: SidebarInteraction
  controller: ReturnType<typeof createProviderLimitsController>
  codex: ProviderQuotaAdapter
  navigationSection: number
  capabilities?: () => Promise<ProviderQuotaCapability[]>
}) {
  const icons = useIcons()
  const dialogs = useDialogs(props.api)
  const model = () => props.controller.current().model
  const snapshot = props.controller.snapshot
  const count = () => (snapshot()?.windows.length ?? 0) + (snapshot()?.balances?.length ?? 0)
  const action = (id: string, row: number, label: string, onActivate: () => void, disabled = false) => (
    <LimitsAction
      api={props.api}
      interaction={props.interaction}
      id={`${PLUGIN_ID}.limits.${id}`}
      position={{ section: props.navigationSection, row, column: 0 }}
      label={label}
      onActivate={onActivate}
      disabled={disabled}
    />
  )

  function openCredits() {
    const selected = model()

    if (selected)
      dialogs.open(() => (
        <ResetCreditDialog
          api={props.api}
          preferences={props.preferences}
          controller={props.controller}
          adapter={props.codex}
          model={selected}
        />
      ))
  }

  return (
    <Section
      api={props.api}
      interaction={props.interaction}
      sectionId={`${PLUGIN_ID}.section.limits`}
      navigationSection={props.navigationSection}
      title="LIMITS"
      section="limits"
      summary={count() ? String(count()) : ''}
      open={props.preferences.expanded().limits}
      onToggle={() => props.preferences.toggleSectionExpanded('limits')}
    >
      <Show
        when={model()}
        fallback={<text fg={props.api.theme.current.textMuted}>Open a session to view model limits</text>}
      >
        {(selected) => (
          <box gap={1}>
            <text fg={props.api.theme.current.textMuted} wrapMode="none" truncate>
              {selected().providerID}/{selected().modelID}
            </text>
            <CodexAccountControls {...props} model={selected()} />
            <Show when={snapshot() && ['ready', 'stale'].includes(snapshot()!.availability) ? snapshot() : undefined}>
              {(quota) => <QuotaSnapshotRows api={props.api} snapshot={quota()} />}
            </Show>
            <Show when={snapshot()?.bankedResets}>
              {(credits) => (
                <>
                  <text fg={props.api.theme.current.textMuted}>Banked resets: {credits().availableCount}</text>
                  <Show when={credits().availableCount > 0 || props.preferences.pendingResetAttempt()}>
                    {action('credits', 2, `${icons.icon('info')} Review reset credits`, openCredits)}
                  </Show>
                </>
              )}
            </Show>
            <LimitsStatus api={props.api} controller={props.controller} />
            <Show when={props.controller.current().adapter || selected().hostConnection?.status === 'unavailable'}>
              {action(
                'refresh',
                3,
                `${icons.icon('retry')} ${props.controller.state().status === 'error' ? 'Retry' : 'Refresh'}`,
                () => void props.controller.refresh(true),
                ['loading', 'refreshing'].includes(props.controller.state().status),
              )}
            </Show>
            {action('sources', 6, `${icons.icon('info')} Provider sources`, () =>
              dialogs.open(() => <ProviderSupportDialog api={props.api} load={props.capabilities} />),
            )}
          </box>
        )}
      </Show>
    </Section>
  )
}
