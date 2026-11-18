import type { JSX } from 'solid-js'

// Layout only: the host still owns every control's shape, theme and focus style.
const layout = `
[data-navigator-settings] { display: grid; gap: 24px; min-width: 0; container-type: inline-size; }
[data-navigator-settings] [data-component="settings-row"] { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: center; gap: 20px; }
[data-navigator-settings] [data-component="settings-row"]:not(:has([data-slot="settings-row-control"])) { grid-template-columns: minmax(0, 1fr); }
[data-navigator-settings] [data-slot="settings-row-copy"] { min-width: 0; overflow-wrap: anywhere; }
[data-navigator-settings] :is(button, input, textarea, [role="switch"]) { scroll-margin-block: 96px; }
[data-navigator-settings] [data-slot="settings-row-control"] { min-width: 0; max-width: 100%; width: 100%; justify-content: flex-end; flex-wrap: wrap; gap: 8px; }
[data-navigator-settings] [data-slot="settings-row-control"] > * { min-width: 0; max-width: 100%; }
[data-navigator-settings] [data-slot="settings-row-control"] > div:not([data-component]) { flex-wrap: wrap; justify-content: flex-end; }
[data-navigator-settings] [data-navigator-settings-controls] { display: flex; align-items: center; gap: 8px; }
[data-navigator-settings] .navigator-settings-number { flex: 0 1 4.5rem; inline-size: 4.5rem; }
[data-navigator-settings] .navigator-settings-name { flex: 0 1 12rem; inline-size: 12rem; }
[data-navigator-settings] [data-component="button-v2"] { white-space: normal; height: auto; min-height: 24px; overflow-wrap: anywhere; }
[data-navigator-settings] [data-component="text-input-v2"] { min-width: 0; max-width: 100%; }
[data-navigator-settings] [data-navigator-update-control] { justify-items: end; }
[data-navigator-settings] [data-sortable-item]:not(:last-of-type) > [data-component="settings-row"] { border-bottom: 0.5px solid var(--v2-border-border-base); }
@container (max-width: 640px) {
  [data-navigator-settings] [data-component="settings-row"] { grid-template-columns: minmax(0, 1fr); gap: 12px; }
  [data-navigator-settings] [data-slot="settings-row-control"],
  [data-navigator-settings] [data-slot="settings-row-control"] > div:not([data-component]) { justify-content: flex-start; }
  [data-navigator-settings] [data-navigator-update-control] { justify-items: start; }
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
