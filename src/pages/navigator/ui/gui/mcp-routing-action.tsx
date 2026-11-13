import type { Ui } from '@opencode/plugin/gui'

export function GuiMcpRoutingAction(props: { ui: Ui; server: string; mode?: string; open(): void }) {
  const Button = props.ui.Button
  const label = () => (props.mode === 'code' ? 'Code Mode' : props.mode === 'direct' ? 'Direct' : 'Unknown')

  return (
    <Button size="small" variant="ghost" onClick={props.open}>
      <span
        style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', 'clip-path': 'inset(50%)' }}
      >
        Routing mode for {props.server}:{' '}
      </span>
      <span style={{ display: 'inline-grid', 'grid-template-areas': '"label"', 'white-space': 'nowrap' }}>
        <span aria-hidden="true" style={{ 'grid-area': 'label', visibility: 'hidden' }}>
          Code Mode
        </span>
        <span style={{ 'grid-area': 'label', 'text-align': 'center' }}>{label()}</span>
      </span>
    </Button>
  )
}
