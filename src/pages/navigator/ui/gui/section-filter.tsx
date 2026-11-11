import { useNavigatorGui } from './context'

export function SectionFilter(props: {
  label: string
  placeholder: string
  value: string
  change(value: string): void
}) {
  const TextInput = useNavigatorGui().ui.TextInput

  return (
    <div style={{ margin: '8px 0' }}>
      <TextInput
        label={props.label}
        placeholder={props.placeholder}
        value={props.value}
        onInput={props.change}
        class="w-full"
      />
    </div>
  )
}
