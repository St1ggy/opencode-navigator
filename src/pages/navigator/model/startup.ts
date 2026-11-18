import { createEffect, createSignal, untrack } from 'solid-js'

import { SIDEBAR_SECTIONS } from '../../../shared/config'

import type { PreferencesController } from '../../../entities/preferences/model'
import type { SidebarSection } from '../../../shared/config'

export function createSidebarStartup(
  preferences: Pick<PreferencesController, 'ready' | 'expanded' | 'sections' | 'codeModePlacement'>,
) {
  const [pending, setPending] = createSignal(true)
  const [expanded, setExpanded] = createSignal<ReadonlySet<SidebarSection>>()
  let claimed = false

  createEffect(() => {
    if (!pending() || expanded() || !preferences.ready()) return

    const open = untrack(() =>
      SIDEBAR_SECTIONS.filter((id) => preferences.sections()[id] && preferences.expanded()[id]),
    )

    if (preferences.codeModePlacement() === 'mcp' && !open.includes('mcp')) {
      setExpanded(new Set(open.filter((id) => id !== 'code_mode')))

      return
    }

    setExpanded(new Set(open))
  })

  const phase = {
    loading: (id: SidebarSection) =>
      pending() && (expanded()?.has(id) ?? (preferences.sections()[id] && preferences.expanded()[id])),
    complete: () => setPending(false),
  }

  return {
    ...phase,
    claim() {
      if (claimed) return

      claimed = true

      return phase
    },
  }
}

export type SidebarStartup = Pick<ReturnType<typeof createSidebarStartup>, 'loading' | 'complete'>
