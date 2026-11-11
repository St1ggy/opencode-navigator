import { For, Show, createSignal } from 'solid-js'

import { GuiMultilineField } from '../../../../shared/ui/gui'

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
      <Show when={error() || !props.current()}>
        <p role="alert">{error() || 'Server or session changed. Reopen the import.'}</p>
      </Show>
      <Show
        when={preview()}
        fallback={<GuiMultilineField label="Portable settings JSON" value={source()} onInput={setSource} />}
      >
        {(value) => (
          <div
            tabIndex={0}
            aria-label="Portable settings changes"
            style={{ 'max-height': '52vh', 'overflow-y': 'auto' }}
          >
            <p>Scope: {value().target}</p>
            <p>
              Layout: {value().layoutChanged ? 'changed' : 'unchanged'} · MCP:{' '}
              {value().mcpChanged ? 'changed' : 'unchanged'} · Behavior:{' '}
              {value().behaviorChanged ? 'changed' : 'unchanged'}
            </p>
            <For each={value().unsupported}>{(field) => <p>Skipped unsupported field: {field}</p>}</For>
            <pre style={{ 'white-space': 'pre-wrap', 'overflow-wrap': 'anywhere' }}>
              {JSON.stringify(value().settings, undefined, 2)}
            </pre>
          </div>
        )}
      </Show>
    </Dialog>
  )
}
