import type { JSX } from 'solid-js'

// Layout only: the host still owns every control's shape, theme and focus style.
const layout = `
[data-navigator-settings] { display: grid; gap: 32px; min-width: 0; container-type: inline-size; }
[data-navigator-settings] [data-component="settings-row"] { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: center; gap: 20px; }
[data-navigator-settings] [data-slot="settings-row-copy"] { min-width: 0; overflow-wrap: anywhere; }
[data-navigator-settings] :is(button, input, textarea, [role="switch"]) { scroll-margin-block: 96px; }
[data-navigator-settings] [data-slot="settings-row-control"] { min-width: 0; max-width: 100%; width: 100%; flex-wrap: wrap; gap: 8px; }
[data-navigator-settings] [data-slot="settings-row-control"] > * { min-width: 0; max-width: 100%; }
[data-navigator-settings] [data-slot="settings-row-control"] > div:not([data-component]) { width: 100%; flex-wrap: wrap; }
[data-navigator-settings] [data-component="button-v2"] { white-space: normal; height: auto; min-height: 24px; overflow-wrap: anywhere; }
[data-navigator-settings] [data-component="text-input-v2"] { min-width: 0; max-width: 100%; }
[data-navigator-settings] [data-sortable-item]:not(:last-of-type) > [data-component="settings-row"] { border-bottom: 0.5px solid var(--v2-border-border-base); }
@container (max-width: 640px) {
  [data-navigator-settings] [data-component="settings-row"] { grid-template-columns: minmax(0, 1fr); gap: 12px; }
  [data-navigator-settings] [data-slot="settings-row-control"] { justify-content: flex-start; }
}
`

export function GuiSettingsSurface(props: { children: JSX.Element }) {
  return (
    <div data-navigator-settings>
      <style>{layout}</style>
      {props.children}
    </div>
  )
}
