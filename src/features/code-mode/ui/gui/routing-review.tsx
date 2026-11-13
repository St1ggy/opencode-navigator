import { GuiChangeValue, GuiCodePanel, GuiNotice, GuiReviewBody } from '../../../../shared/ui/gui'

import type { RoutingPreview } from '../../model'
import type { Ui } from '@opencode/plugin/gui'

export function GuiRoutingReview(props: { ui: Ui; preview: RoutingPreview; before: string }) {
  const Section = props.ui.SettingsSection
  const Row = props.ui.SettingsRow

  return (
    <GuiReviewBody>
      <Section title="Change preview">
        <Row
          title={props.preview.server}
          description="Tool routing only. The connection and permission rules stay unchanged."
        >
          <GuiChangeValue
            ui={props.ui}
            before={props.before}
            after={props.preview.mode === 'code' ? 'Code Mode' : 'Direct'}
          />
        </Row>
      </Section>
      <Section title="Configuration source">
        <Row
          title="Source file"
          description={<span style={{ 'overflow-wrap': 'anywhere' }}>{props.preview.path}</span>}
        />
        <Row
          title="Selected location"
          description={<span style={{ 'overflow-wrap': 'anywhere' }}>{props.preview.target.directory}</span>}
        />
        <Row title="Scope" description="This server configuration file may also be used by other projects." />
      </Section>
      <GuiCodePanel
        ui={props.ui}
        label="Routing field change"
        content={`"codemode": ${String(props.preview.mode === 'code')}`}
        language="json"
      />
      <GuiNotice ui={props.ui} title="Applies after the host reloads configuration">
        In-flight work is not cancelled. Tool availability may change at a later step boundary.
      </GuiNotice>
    </GuiReviewBody>
  )
}
