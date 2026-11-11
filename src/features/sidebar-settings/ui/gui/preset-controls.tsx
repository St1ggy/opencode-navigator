import type { GuiSettingsServices } from './settings-contract'

export function GuiPresetControls(
  props: Pick<GuiSettingsServices, 'ui' | 'presets'> & { kind: 'layout' | 'mcp'; name: string },
) {
  const Button = props.ui.Button

  return (
    <div
      role="group"
      aria-label={`${props.kind} preset ${props.name} controls`}
      style={{ display: 'flex', gap: '8px', 'flex-wrap': 'wrap' }}
    >
      <Button size="small" onClick={() => void props.presets.manage(props.kind, props.name, 'rename')}>
        Rename preset
      </Button>
      <Button size="small" onClick={() => void props.presets.manage(props.kind, props.name, 'update')}>
        Update from current settings
      </Button>
      <Button size="small" onClick={() => void props.presets.manage(props.kind, props.name, 'delete')}>
        Delete preset
      </Button>
    </div>
  )
}
