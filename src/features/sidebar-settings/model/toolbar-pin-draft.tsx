import {
  toolbarPinAppearance,
  toolbarPinAppearanceChange,
  validToolbarPinText,
} from '../../../entities/preferences/model'
import { IconPicker, useDialogState, useDialogs } from '../../../shared/ui'

import type { ToolbarPinSettings } from './toolbar-settings'

export function createToolbarPinDraft(props: ToolbarPinSettings & { expected?: string }) {
  const dialogs = useDialogs(props.api)
  const initial = toolbarPinAppearance(props.pin)
  const [base, setBase] = useDialogState('pin-icons', [...initial.base])
  const [text, setText] = useDialogState('pin-text', initial.text)
  const [states, setStates] = useDialogState<Record<string, string[]>>(
    'pin-state-groups',
    Object.fromEntries(Object.entries(initial.states).map(([key, value]) => [key, [...value]])),
  )
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

      const source = props.pin.kind === 'skill' ? props.pin : undefined

      if (
        !props.expected &&
        source &&
        !props.skills?.list().some((skill) => skill.location === source.location && skill.name === source.name)
      )
        throw new Error('Skill source changed; choose it again')

      props.preferences.changeToolbarPin(
        toolbarPinAppearanceChange(props.pin, { base: base(), text: text(), states: states() }, props.expected),
      )
      dialogs.back()
    } catch (error) {
      props.api.ui.toast({ variant: 'error', title: 'Toolbar', message: String(error) })
    }
  }

  return { dialogs, base, text, states, group, changeGroup, choose, editText, save }
}

export type ToolbarPinDraft = ReturnType<typeof createToolbarPinDraft>
