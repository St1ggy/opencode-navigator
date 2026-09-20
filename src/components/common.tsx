import { type JSX, Show, createSignal, onCleanup } from 'solid-js'

import { useIcons } from '../icons/context'

import { SelectionBox } from './selection-box'

import type { SidebarInteraction, SidebarNavigationDescriptor, SidebarOrder } from '../sidebar-interaction'
import type { SidebarSection } from '../state'
import type { TuiPluginApi, TuiThemeCurrent } from '@opencode-ai/plugin/tui'
import type { BoxRenderable, InputRenderable, MouseEvent, RGBA, Renderable } from '@opentui/core'

export function sidebarInteractiveColors(
  theme: TuiThemeCurrent,
  state: { focused: boolean; hovered: boolean; disabled: boolean },
  normalColor: RGBA = theme.text,
  mode: 'row' | 'control' = 'row',
) {
  const highlighted = !state.disabled && (state.focused || (mode === 'control' && state.hovered))

  return {
    backgroundColor: highlighted
      ? theme.primary
      : mode === 'control'
        ? 'transparent'
        : state.focused || state.hovered
          ? theme.backgroundElement
          : theme.backgroundPanel,
    foregroundColor: state.disabled ? theme.textMuted : highlighted ? theme.selectedListItemText : normalColor,
  }
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

type SectionProps = {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  sectionId?: string
  order?: number
  title: string
  icon?: string
  section?: SidebarSection
  summary: string
  headerAction?: SectionHeaderAction
  open: boolean
  onToggle: () => void
  children: JSX.Element
}

type SectionHeaderAction = {
  id: string
  order: SidebarOrder
  label: () => string
  disabled: () => boolean
  onActivate: () => void
}

export function Section(props: SectionProps) {
  const icons = useIcons()
  const icon = () => (props.section ? icons.section(props.section) : props.icon)
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
  const action = props.headerAction
    ? useSidebarItem(
        props.api,
        props.interaction,
        {
          id: props.headerAction.id,
          order: () => props.headerAction!.order,
          disabled: props.headerAction.disabled,
          activate: props.headerAction.onActivate,
        },
        () => theme().accent,
        'control',
      )
    : undefined

  return (
    <box gap={1}>
      <SelectionBox
        ref={(node: BoxRenderable) => item.ref(node)}
        id={props.sectionId}
        flexDirection="row"
        height={1}
        justifyContent="space-between"
        gap={1}
        paddingLeft={1}
        paddingRight={1}
        backgroundColor={item.backgroundColor()}
        onMouseOver={item.onMouseOver}
        onMouseOut={item.onMouseOut}
        onMouseDown={(event) => item.activate(event)}
      >
        <text fg={item.foregroundColor()} flexShrink={0} wrapMode="none">
          <span style={{ fg: item.focused() ? item.foregroundColor() : theme().accent }}>
            {icons.icon(props.open ? 'expanded' : 'collapsed')}
          </span>{' '}
          <span style={{ fg: item.focused() ? item.foregroundColor() : theme().accent }}>
            {icon() ? `${icon()} ` : ''}
          </span>
          <b>{props.title}</b>
        </text>
        <box flexDirection="row" gap={1} flexGrow={1} minWidth={0} justifyContent="flex-end">
          <Show when={action}>
            {(control) => (
              <SelectionBox
                ref={(node: BoxRenderable) => control().ref(node)}
                id={props.headerAction?.id}
                flexShrink={1}
                minWidth={3}
                backgroundColor={control().backgroundColor()}
                onMouseOver={control().onMouseOver}
                onMouseOut={control().onMouseOut}
                onMouseDown={(event) => event.stopPropagation()}
                onMouseUp={(event) => {
                  event.stopPropagation()
                  control().activate(event)
                }}
              >
                <text fg={control().foregroundColor()} wrapMode="none" truncate height={1}>
                  {props.headerAction?.label()}
                </text>
              </SelectionBox>
            )}
          </Show>
          <text
            fg={item.focused() ? item.foregroundColor() : theme().textMuted}
            flexShrink={props.headerAction ? 0 : 1}
            wrapMode="none"
            truncate
            height={1}
          >
            {props.summary}
          </text>
        </box>
      </SelectionBox>
      <Show when={props.open}>{props.children}</Show>
    </box>
  )
}

export const SectionWithHeaderAction = Section

export function matchesFilter(query: string, ...values: (string | undefined)[]) {
  const needle = query.trim().toLocaleLowerCase()

  return !needle || values.some((value) => value?.toLocaleLowerCase().includes(needle))
}

export function SectionFilter(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  id?: string
  order?: SidebarOrder
  query: string
  placeholder: string
  onInput: (value: string) => void
}) {
  const icons = useIcons()
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

  const highlighted = () => item.focused() || inputFocused()
  const textColor = () => (highlighted() ? theme().selectedListItemText : theme().text)
  const mutedColor = () => (highlighted() ? theme().selectedListItemText : theme().textMuted)

  function leaveInput(event?: { preventDefault(): void; stopPropagation(): void }) {
    event?.preventDefault()
    event?.stopPropagation()
    setInputFocused(false)

    if (input && props.interaction) props.interaction.leaveFilter(input)
    else input?.blur()
  }
  onCleanup(() => unregisterInput?.())

  return (
    <SelectionBox
      ref={(node: BoxRenderable) => item.ref(node)}
      id={props.id}
      flexDirection="row"
      gap={1}
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={highlighted() ? theme().primary : item.backgroundColor()}
      onMouseOver={item.onMouseOver}
      onMouseOut={item.onMouseOut}
      onMouseDown={(event) => item.activate(event)}
    >
      <text flexShrink={0} fg={mutedColor()}>
        {icons.icon('search')}
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
        placeholderColor={mutedColor()}
        textColor={textColor()}
        focusedTextColor={textColor()}
        backgroundColor="transparent"
        focusedBackgroundColor="transparent"
        cursorColor={highlighted() ? theme().selectedListItemText : theme().accent}
        focused={inputFocused()}
        on:focused={() => setInputFocused(true)}
        on:blurred={() => setInputFocused(false)}
        onInput={props.onInput}
        onSubmit={() => leaveInput()}
        onKeyDown={(event) => {
          if (event.name !== 'escape') return

          leaveInput(event)
        }}
      />
      <Show when={props.query}>
        <text flexShrink={0} fg={mutedColor()} onMouseDown={() => props.onInput('')}>
          {icons.icon('close')}
        </text>
      </Show>
    </SelectionBox>
  )
}
