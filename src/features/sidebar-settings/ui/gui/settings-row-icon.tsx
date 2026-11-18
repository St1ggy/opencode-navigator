import type { IconName, Ui } from '@opencode/plugin/gui'
import type { JSX } from 'solid-js'

export function GuiSettingsRowIcon(props: { ui: Ui; icon: IconName; children: JSX.Element }) {
  const Icon = props.ui.Icon

  return (
    <span style={{ display: 'inline-flex', 'align-items': 'center', gap: '8px' }}>
      <Icon name={props.icon} />
      <span>{props.children}</span>
    </span>
  )
}
