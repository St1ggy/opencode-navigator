import type * as ToolbarDialogs from './open-toolbar'
import type { ToolbarPinSettings, ToolbarSettings } from './toolbar-settings'

async function load(input: ToolbarSettings) {
  const path = import.meta.url.includes('/dist/') ? './toolbar-settings.js' : './open-toolbar'

  try {
    return (await import(path)) as typeof ToolbarDialogs
  } catch (error) {
    input.api.ui.toast({ variant: 'error', title: 'Toolbar', message: String(error) })

    return
  }
}
export async function openToolbarManager(input: ToolbarSettings) {
  const route = JSON.stringify(input.api.route.current)
  const target = input.skills?.target().key
  const wasOpen = input.api.ui.dialog.open
  const module = await load(input)

  if (
    route === JSON.stringify(input.api.route.current) &&
    target === input.skills?.target().key &&
    (!wasOpen || input.api.ui.dialog.open) &&
    !input.api.lifecycle?.signal?.aborted
  )
    module?.openToolbarManager(input)
}
export async function openToolbarPin(input: ToolbarPinSettings) {
  const route = JSON.stringify(input.api.route.current)
  const target = input.skills?.target().key
  const wasOpen = input.api.ui.dialog.open
  const module = await load(input)

  if (
    route === JSON.stringify(input.api.route.current) &&
    target === input.skills?.target().key &&
    (!wasOpen || input.api.ui.dialog.open) &&
    !input.api.lifecycle?.signal?.aborted
  )
    module?.openToolbarPin(input)
}
