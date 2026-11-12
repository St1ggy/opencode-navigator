import { For } from 'solid-js'

import { GuiQuotaWindow } from '../../../src/pages/navigator/ui/gui/quota-window'

const now = 1_800_000_000_000

export function QuotaScalesFixture(props) {
  return (
    <div style={{ width: '300px', 'max-width': '100%' }}>
      <For each={[90, 74, 60, 40]}>
        {(remaining) => (
          <GuiQuotaWindow
            ui={props.ui}
            now={now}
            window={{
              id: `synthetic-${remaining}`,
              label: `Synthetic quota ${remaining}`,
              unit: '%',
              remaining,
              durationMinutes: 10_080,
              resetsAt: now / 1000 + 0.81 * 604_800,
            }}
          />
        )}
      </For>
    </div>
  )
}
