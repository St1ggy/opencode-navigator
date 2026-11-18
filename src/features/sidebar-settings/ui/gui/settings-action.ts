import { createSignal } from 'solid-js'

export function createSettingsAction() {
  const [busy, setBusy] = createSignal(false)
  const [status, setStatus] = createSignal('')

  async function run(action: () => Promise<unknown>, message: string) {
    if (busy()) return

    setBusy(true)
    setStatus('')
    try {
      await action()
      setStatus(message)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Settings could not be saved. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return { busy, status, run }
}

export type GuiSettingsAction = ReturnType<typeof createSettingsAction>
