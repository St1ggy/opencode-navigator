import { Show, createSignal } from 'solid-js'

import { GuiCodePanel, GuiNotice, GuiReviewBody } from '../../../../shared/ui/gui'

import type { Ui } from '@opencode/plugin/gui'

type Preview = { token: string; file: string; after: string }

export function GuiProjectProfileDialog(props: {
  ui: Ui
  current(): boolean
  preview(name: string, replace: boolean): Promise<Preview>
  save(value: Preview): Promise<void>
  close(): void
}) {
  const Dialog = props.ui.Dialog
  const Button = props.ui.Button
  const TextInput = props.ui.TextInput
  const Switch = props.ui.Switch
  const Section = props.ui.SettingsSection
  const Row = props.ui.SettingsRow
  const [name, setName] = createSignal('')
  const [replace, setReplace] = createSignal(false)
  const [preview, setPreview] = createSignal<Preview>()
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal('')

  async function run(save: boolean) {
    if (busy() || !props.current()) return

    setBusy(true)
    setError('')
    try {
      const value = preview()

      if (save && value) {
        await props.save(value)
        props.close()
      } else setPreview(await props.preview(name(), replace()))
    } catch (error_) {
      setError(
        error_ instanceof Error ? error_.message : 'Could not write this profile. Review the file before retrying.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      title={preview() ? 'Project profile file preview' : 'Save a project profile'}
      size="large"
      description="Save a commit-safe named layout/MCP profile on the selected server. Favorites, paths, trust, history and account bindings are excluded. Profiles apply only when selected manually."
      footer={
        <>
          <Button disabled={busy()} onClick={props.close}>
            Cancel
          </Button>
          <Show
            when={preview()}
            fallback={
              <Button disabled={!props.current() || !name().trim()} busy={busy()} onClick={() => void run(false)}>
                Preview file
              </Button>
            }
          >
            <Button disabled={busy()} onClick={() => setPreview(undefined)}>
              Back
            </Button>
            <Button variant="contrast" disabled={!props.current()} busy={busy()} onClick={() => void run(true)}>
              Save project profile
            </Button>
          </Show>
        </>
      }
    >
      <GuiReviewBody>
        <Show when={error() || !props.current()}>
          <GuiNotice ui={props.ui} title="Profile unavailable" error>
            {error() || 'Scope, server or location changed. Reopen this profile.'}
          </GuiNotice>
        </Show>
        <Show
          when={preview()}
          fallback={
            <Section title="Project profile">
              <Row title="Profile name" description="A named layout and MCP configuration, applied manually.">
                <TextInput label="Project profile name" value={name()} onInput={setName} />
              </Row>
              <Row title="Replace existing profile" description="Replace only a profile with this exact name.">
                <Switch
                  label="Replace an existing profile with this exact name"
                  hideLabel
                  checked={replace()}
                  onChange={setReplace}
                />
              </Row>
            </Section>
          }
        >
          {(value) => (
            <>
              <Section title="File preview">
                <Row
                  title="Destination"
                  description={<span style={{ 'overflow-wrap': 'anywhere' }}>{value().file}</span>}
                />
              </Section>
              <GuiCodePanel
                ui={props.ui}
                label="Project profile file changes"
                content={value().after}
                language="json"
              />
              <GuiNotice ui={props.ui} title="Commit-safe configuration">
                Private favorites, paths, trust, history and account bindings are excluded. Saving does not apply the
                profile.
              </GuiNotice>
            </>
          )}
        </Show>
      </GuiReviewBody>
    </Dialog>
  )
}
