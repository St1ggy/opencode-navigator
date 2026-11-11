import type { IconName, Ui } from '@opencode/plugin/gui'

export function GuiIconAction(props: {
  ui: Ui
  icon: IconName
  label: string
  disabled?: boolean
  busy?: boolean
  variant?: 'neutral' | 'ghost' | 'ghost-muted'
  onClick?(event: MouseEvent): void
}) {
  const IconButton = props.ui.IconButton
  const Tooltip = props.ui.Tooltip

  return (
    <Tooltip value={props.label}>
      <IconButton
        icon={props.icon}
        label={props.label}
        size="small"
        variant={props.variant ?? 'ghost-muted'}
        disabled={props.disabled}
        busy={props.busy}
        onClick={props.onClick}
      />
    </Tooltip>
  )
}
