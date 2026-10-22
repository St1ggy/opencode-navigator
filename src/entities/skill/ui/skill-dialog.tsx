import { type ScrollBoxRenderable } from '@opentui/core'
import { onCleanup } from 'solid-js'

import { PLUGIN_ID } from '../../../shared/config'
import { type DialogNavigation, DialogSurface, useDialogState, useDialogs } from '../../../shared/ui'

import { SkillConfirmation } from './skill-confirmation'
import { SkillDetails } from './skill-details'
import { SkillDialogHeader } from './skill-dialog-header'

import type { SkillInfo } from '../model/controller'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

type SkillDialogAction = 'accept' | 'cancel' | 'favorite' | 'configure'

export function SkillDialog(props: {
  api: TuiPluginApi
  skill: SkillInfo
  favorite: boolean
  favoriteDisabled: boolean
  onToggleFavorite: () => void
  onAccept: (skipConfirmation: boolean) => void
  onConfigure?: (navigation: DialogNavigation) => void
}) {
  const dialogs = useDialogs(props.api)
  const [skipConfirmation, setSkipConfirmation] = useDialogState('skill-skip', false)
  const [active, setActive] = useDialogState<SkillDialogAction>('skill-action', 'accept')
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

    if (props.onConfigure) actions.push('configure')

    const index = actions.indexOf(active())

    setActive(actions[(index + offset + actions.length) % actions.length])
  }

  function submit() {
    if (active() === 'accept') accept()
    else if (active() === 'cancel') cancel()
    else if (active() === 'configure') props.onConfigure?.(dialogs)
    else if (!props.favoriteDisabled) props.onToggleFavorite()
  }

  function confirmationAction(): 'accept' | 'cancel' | undefined {
    const action = active()

    return action === 'favorite' || action === 'configure' ? undefined : action
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
      <SkillDialogHeader
        api={props.api}
        name={props.skill.name}
        favorite={props.favorite}
        favoriteDisabled={props.favoriteDisabled}
        active={active()}
        onActive={setActive}
        onFavorite={props.onToggleFavorite}
        onConfigure={props.onConfigure ? () => props.onConfigure?.(dialogs) : undefined}
        onCancel={cancel}
      />
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
