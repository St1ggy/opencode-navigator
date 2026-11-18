import type { LoadingLayout, LoadingLayoutCache } from '../../shared/ui/gui'
import type { Context } from '@opencode/plugin/gui'

export function createGuiSectionLayouts(context: Context): LoadingLayoutCache {
  const [state, update] = context.storage.memory<{ layouts: Record<string, LoadingLayout> }>(
    `${context.id}.startup-layout-v1`,
    {
      initial: { layouts: {} },
    },
  )

  return {
    read: (key) => state.layouts[key],
    write(key, layout) {
      if (JSON.stringify(state.layouts[key]) === JSON.stringify(layout)) return

      update((draft) => {
        const keys = Object.keys(draft.layouts)

        if (!draft.layouts[key] && keys.length >= 64) delete draft.layouts[keys[0]]

        draft.layouts[key] = { ...layout, rects: layout.rects.map((rect) => ({ ...rect })) }
      })
    },
  }
}
