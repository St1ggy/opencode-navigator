import { Suspense, lazy } from 'solid-js'

import type { IconPicker as Picker } from './icon-picker/icon-picker'
import type { IconPickerProps } from './icon-picker/types'

const PickerComponent = lazy(async () => {
  const path = import.meta.url.includes('/dist/tui.js') ? './icon-picker.js' : './icon-picker/icon-picker'
  const module = (await import(path)) as { IconPicker: typeof Picker }

  return { default: module.IconPicker }
})

export function IconPicker(props: IconPickerProps) {
  return (
    <box>
      <Suspense>
        <PickerComponent {...props} />
      </Suspense>
    </box>
  )
}
