/** @jsxImportSource @opentui/solid */
import type { createV2Keymap } from './keymap-adapter'
import type { Plugin } from '@opencode/plugin/tui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

type KeymapAdapter = ReturnType<typeof createV2Keymap>
type LegacySlotPlugin = Parameters<TuiPluginApi['slots']['register']>[0]

export function createV2Slots(
  context: Plugin.Context,
  keymap: KeymapAdapter,
  onDispose: (dispose: () => void) => void,
) {
  return {
    register(plugin: LegacySlotPlugin) {
      const slots = plugin.slots
      const cleanups = [
        context.ui.slot({
          append: 'app',
          render: () => (
            <>
              <keymap.Bridge />
              {slots.app?.(undefined as never, {})}
            </>
          ),
        }),
        context.ui.slot({
          replace: 'sidebar.content',
          render: (input) => {
            const sessionID = input.sessionID

            // OpenCode 2 owns the title above this slot. Rendering the V1 title
            // here duplicates it and adds an extra header row inside the scroll area.
            return slots.sidebar_content?.(undefined as never, { session_id: sessionID })
          },
        }),
      ]

      for (const cleanup of cleanups) onDispose(cleanup)

      return 'opencode-navigator'
    },
  } as TuiPluginApi['slots']
}
