import { Show } from 'solid-js'

import type { Ui } from '@opencode/plugin/gui'

const motion = `@keyframes navigator-install-pulse { from { transform: translateX(-100%); } to { transform: translateX(400%); } }
@media (prefers-reduced-motion: reduce) { [data-navigator-install-pulse] { animation: none !important; } }`

export function GuiProgress(props: { ui: Ui; label: string; value?: number }) {
  const Loader = props.ui.Loader

  return (
    <div
      role="progressbar"
      aria-label={props.label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={props.value === undefined ? undefined : Math.floor(props.value * 100)}
      aria-valuetext={props.label}
      style={{ display: 'grid', gap: '6px', 'min-width': '0' }}
    >
      <style>{motion}</style>
      <span style={{ display: 'flex', gap: '6px', 'align-items': 'center' }}>
        <Show when={props.value === undefined}>
          <Loader size="small" />
        </Show>
        {props.label}
      </span>
      <span style={{ display: 'block', height: '3px', overflow: 'hidden', background: 'var(--v2-border-border-base)' }}>
        <span
          data-navigator-install-pulse={props.value === undefined ? '' : undefined}
          style={{
            display: 'block',
            height: '100%',
            width: props.value === undefined ? '25%' : `${Math.min(1, Math.max(0, props.value)) * 100}%`,
            background: 'var(--v2-text-text-base)',
            animation: props.value === undefined ? 'navigator-install-pulse 1.2s linear infinite' : undefined,
          }}
        />
      </span>
    </div>
  )
}
