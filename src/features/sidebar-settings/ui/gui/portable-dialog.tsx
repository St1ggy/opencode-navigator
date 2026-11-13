import { For, Show, createSignal } from 'solid-js'

import { GuiCodePanel, GuiMultilineField, GuiNotice, GuiReviewBody } from '../../../../shared/ui/gui'

import type { PreferencesController } from '../../../../entities/preferences/model'
import type { Ui } from '@opencode/plugin/gui'

export function GuiPortableSettingsDialog(props: {
  ui: Ui
  preferences: PreferencesController
  current(): boolean
  close(): void
}) {
  const Dialog = props.ui.Dialog
  const Button = props.ui.Button
  const Section = props.ui.SettingsSection
  const Row = props.ui.SettingsRow
  const [source, setSource] = createSignal('')
  const [preview, setPreview] = createSignal<ReturnType<PreferencesController['previewPortableSettings']>>()
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal('')

  function review() {
    setError('')
    try {
      setPreview(props.preferences.previewPortableSettings(source()))
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Invalid portable settings.')
    }
  }
  async function apply() {
    const value = preview()

    if (!value || busy() || !props.current() || value.target !== props.preferences.selectedScopeKey()) return

    setBusy(true)
    setError('')
    try {
      await props.preferences.applyPortableSettings(value)
      props.close()
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Could not apply settings. Review again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      title={preview() ? 'Portable settings preview' : 'Import portable settings'}
      size="large"
      description="Supported layout, MCP and toolbar behavior settings apply together to the selected scope. Private data is not imported."
      footer={
        <>
          <Button onClick={props.close}>Cancel</Button>
          <Show
            when={preview()}
            fallback={
              <Button disabled={!props.current()} onClick={review}>
                Preview import
              </Button>
            }
          >
            <Button onClick={() => setPreview(undefined)}>Back</Button>
            <Button
              variant="contrast"
              busy={busy()}
              disabled={!props.current() || preview()?.target !== props.preferences.selectedScopeKey()}
              onClick={() => void apply()}
            >
              Apply imported settings
            </Button>
          </Show>
        </>
      }
    >
      <GuiReviewBody>
        <Show when={error() || !props.current()}>
          <GuiNotice ui={props.ui} title="Import unavailable" error>
            {error() || 'Server or session changed. Reopen the import.'}
          </GuiNotice>
        </Show>
        <Show
          when={preview()}
          fallback={<GuiMultilineField label="Portable settings JSON" value={source()} onInput={setSource} />}
        >
          {(value) => (
            <>
              <Section title="Import summary">
                <Row title="Scope" description={value().target} />
                <Row title="Layout">
                  <span>{value().layoutChanged ? 'Changed' : 'Unchanged'}</span>
                </Row>
                <Row title="MCP">
                  <span>{value().mcpChanged ? 'Changed' : 'Unchanged'}</span>
                </Row>
                <Row title="Behavior">
                  <span>{value().behaviorChanged ? 'Changed' : 'Unchanged'}</span>
                </Row>
              </Section>
              <Show when={value().unsupported.length > 0}>
                <Section title="Skipped fields">
                  <For each={value().unsupported}>
                    {(field) => (
                      <Row
                        title={<span style={{ 'overflow-wrap': 'anywhere' }}>{field}</span>}
                        description="Not supported by this Navigator version."
                      />
                    )}
                  </For>
                </Section>
              </Show>
              <GuiCodePanel
                ui={props.ui}
                label="Portable settings changes"
                content={JSON.stringify(value().settings, undefined, 2)}
                language="json"
              />
            </>
          )}
        </Show>
      </GuiReviewBody>
    </Dialog>
  )
}
