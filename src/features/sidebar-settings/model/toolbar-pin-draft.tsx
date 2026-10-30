import { toolbarPinIcons, toolbarPinKey, validToolbarPinText } from '../../../entities/preferences'
import { IconPicker, useDialogState, useDialogs } from '../../../shared/ui'

import type { ToolbarPinSettings } from './toolbar-settings'

export function createToolbarPinDraft(props: ToolbarPinSettings & { expected?: string }) {
  const dialogs = useDialogs(props.api)
  const initialStates = Object.fromEntries(
    Object.keys({ ...props.pin.stateIcons, ...props.pin.stateIconLists }).map((state) => [
      state,
      [...toolbarPinIcons(props.pin, state)],
    ]),
  )
  const [base, setBase] = useDialogState('pin-icons', [...toolbarPinIcons(props.pin)])
  const [text, setText] = useDialogState('pin-text', props.pin.text ?? '')
  const [states, setStates] = useDialogState<Record<string, string[]>>('pin-state-groups', initialStates)
  const [sourceRoute] = useDialogState('pin-route', JSON.stringify(props.api.route.current))
  const [sourceTarget] = useDialogState('pin-target', props.skills?.target().key)
  const group = (state?: string) => (state ? (states()[state] ?? base()) : base())
  const changeGroup = (value: readonly string[], state?: string) => {
    if (state) setStates((previous) => ({ ...previous, [state]: [...value] }))
    else setBase([...value])
  }

  function choose(state?: string) {
    dialogs.open(
      () => (
        <IconPicker
          api={props.api}
          value={group(state)[0] ?? 'bolt'}
          onSelect={(id) => {
            changeGroup([id, ...group(state).slice(1)], state)
            dialogs.back()
          }}
        />
      ),
      'large',
    )
  }
  function editText() {
    dialogs.prompt({
      title: 'Toolbar button text',
      value: text(),
      description: () => (
        <text fg={props.api.theme.current.textMuted}>
          Optional single line, up to 128 characters. Leave empty for icons only.
        </text>
      ),
      onConfirm(value) {
        if (!validToolbarPinText(value)) throw new Error('Use a single line of up to 128 characters')

        setText(value.trim())
        dialogs.back()
      },
    })
  }
  function save() {
    try {
      if (sourceRoute() !== JSON.stringify(props.api.route.current) || sourceTarget() !== props.skills?.target().key)
        throw new Error('Workspace or session changed; reopen pin configuration')

      if (!text() && (base().length === 0 || Object.values(states()).some((value) => value.length === 0)))
        throw new Error('Add an icon or text for every configured appearance')

      const source = props.pin.kind === 'skill' ? props.pin.location : undefined

      if (!props.expected && source && !props.skills?.list().some((skill) => skill.location === source))
        throw new Error('Skill source changed; choose it again')

      const stateIcons = Object.fromEntries(
        Object.entries(states())
          .filter(([, value]) => value.length === 1)
          .map(([key, value]) => [key, value[0]]),
      )
      const stateIconLists = Object.fromEntries(Object.entries(states()).filter(([, value]) => value.length !== 1))
      const pin = {
        ...props.pin,
        icon: base()[0] ?? props.pin.icon,
        icons: base().length === 1 ? undefined : base(),
        text: text() || undefined,
        stateIcons,
        stateIconLists,
      }
      const keys = Object.keys({ ...initialStates, ...states() })

      props.preferences.changeToolbarPin(
        props.expected
          ? {
              operation: 'configure',
              key: toolbarPinKey(pin),
              icon: pin.icon,
              icons: pin.icons ?? null,
              text: pin.text ?? null,
              expected: props.expected,
              stateIcons: Object.fromEntries(keys.map((key) => [key, stateIcons[key] ?? null])),
              stateIconLists: Object.fromEntries(keys.map((key) => [key, stateIconLists[key] ?? null])),
            }
          : { operation: 'pin', pin },
      )
      dialogs.back()
    } catch (error) {
      props.api.ui.toast({ variant: 'error', title: 'Toolbar', message: String(error) })
    }
  }

  return { dialogs, base, text, states, group, changeGroup, choose, editText, save }
}

export type ToolbarPinDraft = ReturnType<typeof createToolbarPinDraft>
