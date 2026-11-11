import { createEffect, createSignal, onCleanup } from 'solid-js'

import { updateProgressView } from '../../../entities/navigator-release/model'

import type { UpdateProgress } from '../../../entities/navigator-release/model'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function VersionInstallProgress(props: { api: TuiPluginApi; label: string; progress: UpdateProgress }) {
  const [frame, setFrame] = createSignal(0)
  const view = () => updateProgressView(props.progress)
  const caption = () => {
    const labels = { preparing: 'Prepare', downloading: 'Download', installing: 'Update', verifying: 'Verify' }
    const fraction = view().fraction

    return fraction === undefined
      ? labels[props.progress.phase]
      : `${labels[props.progress.phase]} ${Math.floor(fraction * 100)}%`
  }

  createEffect(() => {
    if (view().fraction !== undefined) return

    const timer = setInterval(() => setFrame((value) => (value + 1) % 7), 200)

    onCleanup(() => clearInterval(timer))
  })
  const bar = () =>
    Array.from({ length: 8 }, (_, index) => {
      const value = view().fraction

      if (value !== undefined) return index < Math.round(value * 8) ? '=' : '-'

      return index === frame() || index === frame() + 1 ? '=' : '-'
    }).join('')

  return (
    <text fg={props.api.theme.current.textMuted}>
      {props.label} [{bar()}] {caption()}
    </text>
  )
}
