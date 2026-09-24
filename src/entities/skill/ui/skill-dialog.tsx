import { type ScrollBoxRenderable, TextAttributes } from '@opentui/core'
import { createSignal, onCleanup } from 'solid-js'

import { PLUGIN_ID } from '../../../shared/config'
import { BookmarkControl, DialogSurface, useDialogs, useIcons } from '../../../shared/ui'

import { SkillConfirmation } from './skill-confirmation'
import { SkillDetails } from './skill-details'

import type { SkillInfo } from '../model/controller'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

type SkillDialogAction = 'accept' | 'cancel' | 'favorite'

export function SkillDialog(props: {
  api: TuiPluginApi
  skill: SkillInfo
  favorite: boolean
  favoriteDisabled: boolean
  onToggleFavorite: () => void
  onAccept: (skipConfirmation: boolean) => void
}) {
  const icons = useIcons()
  const dialogs = useDialogs(props.api)
  const [skipConfirmation, setSkipConfirmation] = createSignal(false)
  const [active, setActive] = createSignal<SkillDialogAction>('accept')
  const theme = () => props.api.theme.current
  let body: ScrollBoxRenderable | undefined

  function accept() {
    const isSkip = skipConfirmation()

    dialogs.close()
    props.onAccept(isSkip)
  }

  function cancel() {
    dialogs.back()
  }

  function move(offset: number) {
    const actions: SkillDialogAction[] = props.favoriteDisabled
      ? ['accept', 'cancel']
      : ['accept', 'cancel', 'favorite']
    const index = actions.indexOf(active())

    setActive(actions[(index + offset + actions.length) % actions.length])
  }

  function submit() {
    if (active() === 'accept') accept()
    else if (active() === 'cancel') cancel()
    else if (!props.favoriteDisabled) props.onToggleFavorite()
  }

  function confirmationAction(): 'accept' | 'cancel' | undefined {
    const action = active()

    return action === 'favorite' ? undefined : action
  }

  const unregister = props.api.keymap.registerLayer({
    mode: 'modal',
    priority: 1000,
    commands: [
      { name: `${PLUGIN_ID}.skill-dialog.scroll-up`, run: () => body?.scrollBy(-1) },
      { name: `${PLUGIN_ID}.skill-dialog.scroll-down`, run: () => body?.scrollBy(1) },
      {
        name: `${PLUGIN_ID}.skill-dialog.previous`,
        run: () => move(-1),
      },
      {
        name: `${PLUGIN_ID}.skill-dialog.next`,
        run: () => move(1),
      },
      {
        name: `${PLUGIN_ID}.skill-dialog.toggle-skip`,
        run() {
          setSkipConfirmation((value) => !value)
        },
      },
      {
        name: `${PLUGIN_ID}.skill-dialog.submit`,
        run: submit,
      },
    ],
    bindings: [
      { key: 'up', cmd: `${PLUGIN_ID}.skill-dialog.scroll-up` },
      { key: 'down', cmd: `${PLUGIN_ID}.skill-dialog.scroll-down` },
      { key: 'left', cmd: `${PLUGIN_ID}.skill-dialog.previous` },
      { key: 'right', cmd: `${PLUGIN_ID}.skill-dialog.next` },
      { key: 'tab', cmd: `${PLUGIN_ID}.skill-dialog.next` },
      { key: 'space', cmd: `${PLUGIN_ID}.skill-dialog.toggle-skip` },
      { key: 'return', cmd: `${PLUGIN_ID}.skill-dialog.submit` },
    ],
  })

  onCleanup(unregister)

  return (
    <DialogSurface api={props.api}>
      <box flexDirection="row" justifyContent="space-between" alignItems="center">
        <text attributes={TextAttributes.BOLD} fg={theme().text}>
          {icons.icon('skills')} {props.skill.name}
        </text>
        <box flexDirection="row" gap={1} alignItems="center">
          <BookmarkControl
            bookmarked={props.favorite}
            backgroundColor={active() === 'favorite' ? theme().primary : undefined}
            foregroundColor={
              props.favoriteDisabled
                ? theme().textMuted
                : active() === 'favorite'
                  ? theme().selectedListItemText
                  : theme().warning
            }
            onMouseOver={() => {
              if (!props.favoriteDisabled) setActive('favorite')
            }}
            onMouseUp={() => {
              if (!props.favoriteDisabled) props.onToggleFavorite()
            }}
          />
          <text
            fg={theme().textMuted}
            onMouseDown={(event) => event.stopPropagation()}
            onMouseUp={(event) => {
              event.stopPropagation()
              cancel()
            }}
          >
            {icons.key('esc')}
          </text>
        </box>
      </box>
      <SkillDetails api={props.api} skill={props.skill} ref={(node) => (body = node)} />
      <SkillConfirmation
        api={props.api}
        skip={skipConfirmation()}
        active={confirmationAction()}
        onToggleSkip={() => setSkipConfirmation((value) => !value)}
        onActive={setActive}
        onAccept={accept}
        onCancel={cancel}
      />
    </DialogSurface>
  )
}
