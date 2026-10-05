import { createSignal, onMount } from 'solid-js'

import { SelectionMenu, useDialogs } from '../../../shared/ui'
import { providerQuotaCatalog } from '../model/provider-capabilities'

import type { ProviderQuotaCapability } from '../model/provider-capabilities'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function ProviderSupportDialog(props: { api: TuiPluginApi; load?: () => Promise<ProviderQuotaCapability[]> }) {
  const dialogs = useDialogs(props.api)
  const [entries, setEntries] = createSignal(providerQuotaCatalog())

  onMount(() => {
    if (props.load)
      void props
        .load()
        .then(setEntries)
        .catch(() => {})
  })

  return (
    <SelectionMenu
      api={props.api}
      title={`Provider sources · ${entries().length}`}
      height={18}
      options={[
        ...entries().map((entry) => ({
          title: entry.name,
          value: entry.id,
          icon: entry.sources.length > 0 ? ('info' as const) : ('help' as const),
          description: `${entry.sources.length > 0 ? entry.sources.join(', ') : 'API-dependent'} · ${entry.reason}`,
        })),
        { title: 'Close', value: 'close', description: 'Return to the sidebar', icon: 'close' },
      ]}
      onSelect={(option) => {
        if (option.value === 'close') dialogs.back()
      }}
    />
  )
}
