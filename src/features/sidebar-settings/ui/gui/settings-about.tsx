import { createSignal } from 'solid-js'

import { updateProgressView } from '../../../../entities/navigator-release/model'
import { GuiProgress } from '../../../../shared/ui/gui'

import type { GuiAboutServices } from './about-contract'
import type { Ui } from '@opencode/plugin/gui'

export function GuiSettingsAbout(props: { ui: Ui; about: GuiAboutServices; showGuide?(): void }) {
  const Section = props.ui.SettingsSection
  const Row = props.ui.SettingsRow
  const Button = props.ui.Button
  const Select = props.ui.Select
  const Markdown = props.ui.Markdown
  const versions = () => props.about.changelog.filter((entry) => entry.changes.length > 0)
  const [version, setVersion] = createSignal(versions()[0]?.version)
  const changes = () =>
    versions()
      .find((entry) => entry.version === version())
      ?.changes.map((change) => `- ${change}`)
      .join('\n') ?? 'No user-facing release notes are bundled.'
  const progress = () => {
    const current = props.about.progress?.()

    return current && updateProgressView(current)
  }

  return (
    <>
      <Section title="About Navigator" footer={<p role="status">{props.about.status()}</p>}>
        <Row
          title={
            progress() ? (
              <GuiProgress ui={props.ui} label={`Navigator · ${progress()!.label}`} value={progress()!.fraction} />
            ) : (
              `Navigator ${props.about.version}`
            )
          }
          description={`OpenCode Desktop ${props.about.hostVersion}. Experimental Desktop GUI.`}
        >
          <Button busy={props.about.busy()} onClick={() => void props.about.check()}>
            Check for updates
          </Button>
          <Button disabled={!props.about.available() || props.about.busy()} onClick={() => void props.about.update()}>
            Update Navigator
          </Button>
        </Row>
        <Row title="Navigator guide" description="Reopen the seven-slide capability and section-configuration guide.">
          <Button onClick={props.showGuide}>Open Navigator guide</Button>
        </Row>
        <Row title="Report a bug" description="Review an editable Bug report; use authenticated gh or your browser.">
          <Button onClick={props.about.report}>Report a bug</Button>
        </Row>
      </Section>
      <Section title="Changelog" footer={<Markdown text={changes()} />}>
        <Row
          title="Release notes"
          description="Browse shipped notes without resetting or consuming first-launch upgrade notes."
        >
          <Select
            label="Changelog version"
            value={version()}
            onChange={setVersion}
            options={versions().map((entry) => ({ value: entry.version, label: entry.version }))}
          />
        </Row>
      </Section>
    </>
  )
}
