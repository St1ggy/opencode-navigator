import { Show } from 'solid-js'

import { QuotaSnapshotRows, ResetCreditDialog } from '../../../features/provider-limits'
import { PLUGIN_ID } from '../../../shared/config'
import { useDialogs } from '../../../shared/ui'

import { CodexAccountControls } from './codex-account-controls'
import { LimitsHeaderControls } from './limits-header-controls'
import { LimitsModelRow } from './limits-model-row'
import { LimitsStatus } from './limits-status'
import { Section } from './section'

import type { PreferencesController } from '../../../entities/preferences'
import type {
  LimitsModelSelection,
  ProviderQuotaAdapter,
  createProviderLimitsController,
} from '../../../entities/provider-limit'
import type { SidebarInteraction } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function ProviderLimitsSection(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  interaction?: SidebarInteraction
  controller: ReturnType<typeof createProviderLimitsController>
  codex: ProviderQuotaAdapter
  navigationSection: number
  modelSelection?: LimitsModelSelection
}) {
  const dialogs = useDialogs(props.api)
  const model = () => props.controller.current().model
  const snapshot = props.controller.snapshot

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
      summary=""
      headerControls={
        <LimitsHeaderControls
          api={props.api}
          interaction={props.interaction}
          navigationSection={props.navigationSection}
          credits={
            (snapshot()?.bankedResets?.availableCount ?? 0) > 0 || Boolean(props.preferences.pendingResetAttempt())
          }
          refreshing={['loading', 'refreshing'].includes(props.controller.state().status)}
          canRefresh={Boolean(
            model() && (props.controller.current().adapter || model()?.hostConnection?.status === 'unavailable'),
          )}
          onCredits={openCredits}
          onRefresh={() => void props.controller.refresh(true)}
        />
      }
      open={props.preferences.expanded().limits}
      onToggle={() => props.preferences.toggleSectionExpanded('limits')}
    >
      <Show
        when={model()}
        fallback={<text fg={props.api.theme.current.textMuted}>Open a session to view model limits</text>}
      >
        {(selected) => (
          <box>
            <LimitsModelRow {...props} model={selected()} selection={props.modelSelection} />
            <CodexAccountControls {...props} model={selected()} />
            <Show when={snapshot() && ['ready', 'stale'].includes(snapshot()!.availability) ? snapshot() : undefined}>
              {(quota) => <QuotaSnapshotRows api={props.api} snapshot={quota()} />}
            </Show>
            <LimitsStatus api={props.api} controller={props.controller} />
          </box>
        )}
      </Show>
    </Section>
  )
}
