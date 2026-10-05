import { For, Show } from 'solid-js'

import { QuotaWindowRow, ResetCreditDialog, createCodexAccountLink } from '../../../features/provider-limits'
import { PLUGIN_ID } from '../../../shared/config'
import { useDialogs, useIcons } from '../../../shared/ui'

import { LimitsAction } from './limits-action'
import { LimitsStatus } from './limits-status'
import { Section } from './section'

import type { PreferencesController } from '../../../entities/preferences'
import type { ProviderQuotaAdapter, createProviderLimitsController } from '../../../entities/provider-limit'
import type { SidebarInteraction } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function ProviderLimitsSection(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  interaction?: SidebarInteraction
  controller: ReturnType<typeof createProviderLimitsController>
  codex: ProviderQuotaAdapter
  navigationSection: number
}) {
  const icons = useIcons()
  const dialogs = useDialogs(props.api)
  const model = () => props.controller.current().model
  const snapshot = props.controller.snapshot
  const accountLink = createCodexAccountLink({
    api: props.api,
    preferences: props.preferences,
    adapter: props.codex,
    model,
    dialogs,
  })
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

    if (!selected) return

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
      summary={snapshot()?.availability === 'ready' ? String(snapshot()?.windows.length) : ''}
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
            <Show when={!selected().accountID && selected().providerID === 'openai'}>
              <text fg={props.api.theme.current.textMuted}>Link the matching Codex account to read quotas</text>
              {action(
                'link',
                1,
                `${icons.icon('scope')} Link Codex CLI account`,
                () => void accountLink.link(),
                accountLink.busy(),
              )}
            </Show>
            <Show when={selected().accountID && snapshot()?.availability === 'ready'}>
              <text fg={props.api.theme.current.textMuted} wrapMode="none" truncate>
                Codex CLI · {snapshot()?.accountId}
              </text>
              <For each={snapshot()?.windows}>{(window) => <QuotaWindowRow api={props.api} window={window} />}</For>
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
            </Show>
            <LimitsStatus api={props.api} controller={props.controller} />
            <Show when={selected().providerID !== 'openai'}>
              <text fg={props.api.theme.current.textMuted}>No documented quota API for this model</text>
            </Show>
            <Show when={props.controller.current().adapter}>
              {action(
                'refresh',
                3,
                `${icons.icon('retry')} ${props.controller.state().status === 'error' ? 'Retry' : 'Refresh'}`,
                () => void props.controller.refresh(true),
                ['loading', 'refreshing'].includes(props.controller.state().status),
              )}
            </Show>
            <Show when={selected().providerID === 'openai' && selected().accountID}>
              {action('unlink', 4, `${icons.icon('close')} Unlink Codex account`, () =>
                props.preferences.setCodexAccountBinding(selected().providerID, selected().modelID),
              )}
              <Show when={snapshot()?.availability === 'unauthenticated'}>
                {action(
                  'relink',
                  5,
                  `${icons.icon('scope')} Relink Codex account`,
                  () => void accountLink.link(),
                  accountLink.busy(),
                )}
              </Show>
            </Show>
          </box>
        )}
      </Show>
    </Section>
  )
}
