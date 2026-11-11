import { toolbarPinKey } from '../../entities/preferences/model'
import { GuiPinEditor, GuiToolbarManager } from '../../features/pinned-toolbar/gui'

import { guiQuickActionLabel } from './adapters/quick-actions'
import { createSelectedSessionAccess } from './adapters/selected-session'

import type { PreferencesController, ToolbarPin, ToolbarPinUpdate } from '../../entities/preferences/model'
import type { MonitoringRegistry } from './monitoring-registry'
import type { Context } from '@opencode/plugin/gui'

export function createGuiToolbarDialogs(
  context: Context,
  registry: MonitoringRegistry,
  preferences: PreferencesController,
) {
  const access = createSelectedSessionAccess(() => context.sessions.current())
  const label = (pin: ToolbarPin) =>
    pin.kind === 'skill'
      ? pin.name
      : (registry.active()?.catalogs?.actionState(pin.id).label ?? guiQuickActionLabel(pin.id))

  function guard() {
    const scope = access.capture()
    const route = context.router.path()

    return () => (scope ? access.current(scope) : context.router.path() === route)
  }
  async function save(change: ToolbarPinUpdate) {
    await preferences.saveToolbarPin(change)
    await preferences.flush()
  }
  function open(source: ToolbarPin) {
    if (!preferences.ready()) return

    const current = guard()
    const existing = preferences.toolbarPins().find((pin) => toolbarPinKey(pin) === toolbarPinKey(source))
    const pin = { ...(existing ?? source) }
    const expected = existing && JSON.stringify(existing)

    async function apply(change: ToolbarPinUpdate) {
      if (!current()) throw new DOMException('Toolbar target changed; reopen its configuration', 'AbortError')

      if (!expected && pin.kind === 'skill') {
        const present = registry
          .active()
          ?.catalogs?.skills.list()
          .some((skill) => skill.location === pin.location && skill.name === pin.name)

        if (!present) throw new Error('Skill source changed; choose it again')
      }

      await save(change)
    }

    context.dialogs.open((dialog) => (
      <GuiPinEditor
        ui={context.ui}
        dialogs={context.dialogs}
        pin={pin}
        expected={expected}
        title={label(pin)}
        current={current}
        save={apply}
        close={dialog.close}
      />
    ))
  }

  return {
    open,
    configure(key: string) {
      const pin = preferences.toolbarPins().find((item) => toolbarPinKey(item) === key)

      if (pin) open(pin)
    },
    manage() {
      const current = guard()

      async function change(update: ToolbarPinUpdate) {
        if (!current()) throw new DOMException('Toolbar target changed', 'AbortError')

        await save(update)
      }

      async function move(key: string, target: string) {
        const pins = preferences.toolbarPins()
        const index = pins.findIndex((pin) => toolbarPinKey(pin) === key)
        const destination = pins.findIndex((pin) => toolbarPinKey(pin) === target)

        if (index === -1 || destination === -1 || destination >= pins.length) return

        const before = pins[destination + (destination > index ? 1 : 0)]

        await change({ operation: 'move', key, before: before && toolbarPinKey(before) })
      }

      context.dialogs.open((dialog) => (
        <GuiToolbarManager
          ui={context.ui}
          current={current}
          pins={preferences.toolbarPins()}
          label={label}
          close={dialog.close}
          configure={(key) => {
            const pin = preferences.toolbarPins().find((item) => toolbarPinKey(item) === key)

            if (pin) open(pin)
          }}
          remove={(key) => change({ operation: 'remove', key })}
          move={move}
        />
      ))
    },
  }
}
