import { createSignal, onCleanup } from 'solid-js'

import type { SidebarInteraction, SidebarNavigationDescriptor } from '../model/sidebar-interaction'
import type { TuiPluginApi, TuiThemeCurrent } from '@opencode-ai/plugin/tui'
import type { MouseEvent, RGBA, Renderable } from '@opentui/core'

export function sidebarInteractiveColors(
  theme: TuiThemeCurrent,
  state: { focused: boolean; hovered: boolean; disabled: boolean },
  normalColor: RGBA = theme.text,
  mode: 'row' | 'control' = 'row',
) {
  const highlighted = !state.disabled && (state.focused || (mode === 'control' && state.hovered))
  let backgroundColor: RGBA | 'transparent' = theme.backgroundPanel
  let foregroundColor = normalColor

  if (highlighted) backgroundColor = theme.primary
  else if (mode === 'control') backgroundColor = 'transparent'
  else if (state.focused || state.hovered) backgroundColor = theme.backgroundElement

  if (state.disabled) foregroundColor = theme.textMuted
  else if (highlighted) foregroundColor = theme.selectedListItemText

  return { backgroundColor, foregroundColor }
}

export function useSidebarItem(
  api: TuiPluginApi,
  interaction: SidebarInteraction | undefined,
  descriptor: Omit<SidebarNavigationDescriptor, 'renderable'>,
  normalColor: () => RGBA = () => api.theme.current.text,
  mode: 'row' | 'control' = 'row',
) {
  let unregister: (() => void) | undefined
  const [hovered, setHovered] = createSignal(false)
  const disabled = () => descriptor.disabled?.() === true
  const focused = () => Boolean(interaction?.ownsFocus() && interaction.isSelected(descriptor.id))
  const colors = () =>
    sidebarInteractiveColors(
      api.theme.current,
      { focused: focused(), hovered: hovered(), disabled: disabled() },
      normalColor(),
      mode,
    )
  const ref = (renderable: Renderable) => {
    unregister?.()
    unregister = interaction?.register({ ...descriptor, renderable })
  }

  onCleanup(() => unregister?.())

  return {
    ref,
    disabled,
    focused,
    backgroundColor: () => colors().backgroundColor,
    foregroundColor: () => colors().foregroundColor,
    onMouseOver: () => setHovered(true),
    onMouseOut: () => setHovered(false),
    select(event?: MouseEvent) {
      interaction?.mouseSelect(descriptor.id, event)
    },
    activate(event?: MouseEvent) {
      if (interaction) return interaction.mouseActivate(descriptor.id, event)

      if (disabled()) return false

      descriptor.activate()

      return true
    },
  }
}
