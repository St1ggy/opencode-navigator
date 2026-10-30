import { createEffect, onCleanup, untrack } from 'solid-js'

import { toolbarPinKey } from '../../../entities/preferences'
import { QUICK_ACTIONS, quickActionLabel } from '../../../entities/quick-action'
import { SelectionMenu, useDialogs } from '../../../shared/ui'
import { openToolbarPin } from '../model/open-toolbar'
import { openToolbarSources } from '../model/toolbar-sources'

import type { ToolbarSettings } from '../model/toolbar-settings'

export function ToolbarManager(props: ToolbarSettings) {
  const dialogs = useDialogs(props.api)

  createEffect(() => {
    const current = props.skills?.target()

    if (!current || !props.skills) return

    const release = untrack(() => props.skills!.activate(current))

    onCleanup(release)
    untrack(() => {
      void props.skills!.refresh(current).catch(() => {})
    })
  })
  function move(key: string, direction: number) {
    const pins = props.preferences.toolbarPins()
    const index = pins.findIndex((pin) => toolbarPinKey(pin) === key)
    const destination = index + direction

    if (destination < 0 || destination >= pins.length) return

    props.preferences.changeToolbarPin({
      operation: 'move',
      key,
      before: toolbarPinKey(pins[direction < 0 ? destination : destination + 1] ?? pins[index]),
    })
    dialogs.back()
  }

  return (
    <SelectionMenu
      adaptive
      api={props.api}
      title="Pinned toolbar"
      height={18}
      options={[
        { title: 'Add Quick Action…', value: 'action', description: 'Choose an action and its icons', icon: 'add' },
        {
          title: 'Add Skill…',
          value: 'skill',
          description: props.skills?.error() ?? 'Search the full workspace skill list',
          icon: 'skills',
        },
        ...props.preferences.toolbarPins().map((pin, index) => ({
          title: `${index + 1}. ${
            pin.kind === 'skill'
              ? pin.name
              : quickActionLabel(
                  props.api,
                  QUICK_ACTIONS.find((item) => item.command === pin.id)!,
                )
          }`,
          value: toolbarPinKey(pin),
          description: pin.kind === 'skill' ? pin.location : 'Quick Action',
          icon: 'edit' as const,
        })),
        { title: 'Back', value: 'back', description: 'Return to the previous screen', icon: 'close' },
      ]}
      onSelect={(option) => {
        if (option.value === 'action' || option.value === 'skill') {
          openToolbarSources({ ...props, dialogs }, option.value)

          return
        }

        const pin = props.preferences.toolbarPins().find((item) => toolbarPinKey(item) === option.value)

        if (!pin) {
          dialogs.back()

          return
        }

        dialogs.open(() => (
          <SelectionMenu
            api={props.api}
            title="Toolbar button"
            options={[
              {
                title: 'Configure icons and text…',
                value: 'configure',
                description: 'Zero to three icons, optional text and state choices',
                icon: 'edit',
              },
              { title: 'Move up', value: 'up', description: 'Earlier in the toolbar', icon: 'selected' },
              { title: 'Move down', value: 'down', description: 'Later in the toolbar', icon: 'selected' },
              { title: 'Unpin', value: 'remove', description: 'Keep the original bookmark unchanged', icon: 'delete' },
              { title: 'Cancel', value: 'cancel', description: 'Return', icon: 'close' },
            ]}
            onSelect={(action) => {
              if (action.value === 'configure') openToolbarPin({ ...props, dialogs, pin })
              else if (action.value === 'up' || action.value === 'down')
                move(option.value, action.value === 'up' ? -1 : 1)
              else {
                if (action.value === 'remove')
                  props.preferences.changeToolbarPin({ operation: 'remove', key: option.value })

                dialogs.back()
              }
            }}
          />
        ))
      }}
    />
  )
}
