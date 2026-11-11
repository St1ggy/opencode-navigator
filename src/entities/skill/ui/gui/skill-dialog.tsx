import { Show, createSignal, onCleanup } from 'solid-js'

import type { SkillInfo } from '../../model'
import type { Ui } from '@opencode/plugin/gui'

export function GuiSkillDialog(props: {
  ui: Ui
  skill: SkillInfo
  favorite: boolean
  ready: boolean
  reason?: string
  toggleFavorite(): void
  use(skip: boolean): Promise<boolean>
  close(): void
}) {
  const Dialog = props.ui.Dialog
  const Button = props.ui.Button
  const [trust, setTrust] = createSignal(false)
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal('')
  let disposed = false

  onCleanup(() => {
    disposed = true
  })

  async function use() {
    if (busy() || props.reason) return

    setBusy(true)
    setError('')
    try {
      const inserted = await props.use(trust())

      if (!disposed) {
        if (inserted) props.close()
        else setError('The Skill target changed. Close this dialog and choose it again.')
      }
    } catch (error_) {
      if (!disposed) setError(error_ instanceof Error ? error_.message : 'Could not add the Skill. Try again.')
    } finally {
      if (!disposed) setBusy(false)
    }
  }

  return (
    <Dialog
      title={props.skill.name}
      size="large"
      footer={
        <>
          <Button onClick={props.close}>Cancel</Button>
          <Button variant="contrast" disabled={Boolean(props.reason)} busy={busy()} onClick={() => void use()}>
            Use Skill
          </Button>
        </>
      }
    >
      <section>
        <h3>Description</h3>
        <p>{props.skill.description || 'No description provided.'}</p>
      </section>
      <section>
        <h3>Source</h3>
        <p style={{ 'overflow-wrap': 'anywhere' }}>{props.skill.location || 'Source not exposed by OpenCode'}</p>
        <details>
          <summary>Instructions</summary>
          <pre style={{ 'white-space': 'pre-wrap', 'overflow-wrap': 'anywhere' }}>{props.skill.content}</pre>
        </details>
      </section>
      <section>
        <h3>Confirmation</h3>
        <label>
          <input
            type="checkbox"
            checked={trust()}
            disabled={!props.ready || !props.skill.location}
            onChange={(event) => setTrust(event.currentTarget.checked)}
          />
          Trust this exact source for future use
        </label>
        <Button size="small" variant="ghost" disabled={!props.ready} onClick={props.toggleFavorite}>
          {props.favorite ? 'Remove bookmark' : 'Bookmark Skill'}
        </Button>
        <Show when={props.reason || error()}>
          <p role="alert">{props.reason || error()}</p>
        </Show>
      </section>
    </Dialog>
  )
}
