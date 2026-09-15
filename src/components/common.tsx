import type { TuiPluginApi, TuiThemeCurrent } from "@opencode-ai/plugin/tui"
import type { BoxRenderable, InputRenderable, MouseEvent, Renderable, RGBA } from "@opentui/core"
import { createSignal, onCleanup, Show } from "solid-js"
import type { SidebarInteraction, SidebarNavigationDescriptor } from "../sidebar-interaction"

export function sidebarInteractiveColors(
  theme: TuiThemeCurrent,
  state: { focused: boolean; hovered: boolean; disabled: boolean },
  normalColor: RGBA = theme.text,
) {
  return {
    backgroundColor:
      state.focused && !state.disabled
        ? theme.primary
        : state.focused || state.hovered
          ? theme.backgroundElement
          : theme.backgroundPanel,
    foregroundColor: state.disabled ? theme.textMuted : state.focused ? theme.selectedListItemText : normalColor,
  }
}

export function useSidebarItem(
  api: TuiPluginApi,
  interaction: SidebarInteraction | undefined,
  descriptor: Omit<SidebarNavigationDescriptor, "renderable">,
  normalColor: () => RGBA = () => api.theme.current.text,
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

export function Section(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  sectionId?: string
  order?: number
  title: string
  summary: string
  open: boolean
  onToggle: () => void
  children: import("solid-js").JSX.Element
}) {
  const theme = () => props.api.theme.current
  const item = useSidebarItem(
    props.api,
    props.interaction,
    {
      id: props.sectionId ?? `section.${props.title}`,
      order: () => props.order ?? 0,
      activate: props.onToggle,
    },
    () => theme().text,
  )

  return (
    <box paddingLeft={1} paddingRight={1} gap={1}>
      <box
        ref={(node: BoxRenderable) => item.ref(node)}
        id={props.sectionId}
        flexDirection="row"
        justifyContent="space-between"
        gap={1}
        paddingLeft={1}
        paddingRight={1}
        backgroundColor={item.backgroundColor()}
        onMouseOver={item.onMouseOver}
        onMouseOut={item.onMouseOut}
        onMouseDown={(event) => item.activate(event)}
      >
        <text fg={item.foregroundColor()}>
          <span style={{ fg: item.focused() ? item.foregroundColor() : theme().accent }}>{props.open ? "▾" : "▸"}</span>{" "}
          <b>{props.title}</b>
        </text>
        <box flexDirection="row" gap={1} flexShrink={0}>
          <text fg={item.focused() ? item.foregroundColor() : theme().textMuted}>{props.summary}</text>
        </box>
      </box>
      <Show when={props.open}>{props.children}</Show>
    </box>
  )
}

export function matchesFilter(query: string, ...values: Array<string | undefined>) {
  const needle = query.trim().toLocaleLowerCase()
  return !needle || values.some((value) => value?.toLocaleLowerCase().includes(needle))
}

export function SectionFilter(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  id?: string
  order?: number
  query: string
  placeholder: string
  onInput: (value: string) => void
}) {
  let input: InputRenderable | undefined
  let unregisterInput: (() => void) | undefined
  const [inputFocused, setInputFocused] = createSignal(false)
  const theme = () => props.api.theme.current
  const item = useSidebarItem(props.api, props.interaction, {
    id: props.id ?? `filter.${props.placeholder}`,
    order: () => props.order ?? 0,
    activate: () => {
      if (!input) return
      setInputFocused(true)
      props.interaction?.focusFilter(input)
      if (!props.interaction) input.focus()
    },
  })

  function leaveInput(event?: { preventDefault(): void; stopPropagation(): void }) {
    event?.preventDefault()
    event?.stopPropagation()
    setInputFocused(false)
    if (input && props.interaction) props.interaction.leaveFilter(input)
    else input?.blur()
  }
  onCleanup(() => unregisterInput?.())

  return (
    <box
      ref={(node: BoxRenderable) => item.ref(node)}
      id={props.id}
      flexDirection="row"
      gap={1}
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={item.backgroundColor()}
      onMouseOver={item.onMouseOver}
      onMouseOut={item.onMouseOut}
      onMouseDown={(event) => item.activate(event)}
    >
      <text flexShrink={0} fg={item.focused() || inputFocused() ? item.foregroundColor() : theme().textMuted}>
        ⌕
      </text>
      <input
        ref={(node: InputRenderable) => {
          input = node
          unregisterInput?.()
          unregisterInput = props.interaction?.registerFilter(node, props.id ?? `filter.${props.placeholder}`, () =>
            leaveInput(),
          )
        }}
        flexGrow={1}
        value={props.query}
        placeholder={props.placeholder}
        placeholderColor={theme().textMuted}
        textColor={theme().text}
        focusedTextColor={theme().text}
        backgroundColor="transparent"
        focusedBackgroundColor="transparent"
        cursorColor={theme().accent}
        focused={inputFocused()}
        onInput={props.onInput}
        onSubmit={() => leaveInput()}
        onKeyDown={(event) => {
          if (event.name !== "escape") return
          leaveInput(event)
        }}
      />
      <Show when={props.query}>
        <text flexShrink={0} fg={theme().textMuted} onMouseDown={() => props.onInput("")}>
          ×
        </text>
      </Show>
    </box>
  )
}
