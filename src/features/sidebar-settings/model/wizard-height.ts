import { useRenderer } from '@opentui/solid'
import { createSignal, onCleanup } from 'solid-js'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function useWizardHeight(api: TuiPluginApi) {
  const renderer = api.renderer ?? useRenderer()
  const [height, setHeight] = createSignal(renderer.height)
  const resize = () => setHeight(renderer.height)

  renderer.on('resize', resize)
  onCleanup(() => renderer.off('resize', resize))

  return height
}
