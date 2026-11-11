export function SidebarBookmark(props: {
  title: string
  selected: boolean
  disabled?: boolean
  visible: boolean
  toggle(): void
}) {
  const label = () => `${props.selected ? 'Unbookmark' : 'Bookmark'} ${props.title}`

  return (
    <span
      style={{ width: '24px', 'flex-shrink': '0', visibility: props.visible || props.selected ? 'visible' : 'hidden' }}
    >
      <button
        type="button"
        aria-label={label()}
        title={label()}
        aria-pressed={props.selected}
        disabled={props.disabled}
        onClick={(event) => {
          event.stopPropagation()
          props.toggle()
        }}
        style={{
          width: '24px',
          height: '24px',
          padding: '0',
          display: 'inline-flex',
          'align-items': 'center',
          'justify-content': 'center',
          border: '0',
          'border-radius': '4px',
          color: 'inherit',
          background: props.selected ? 'var(--v2-overlay-simple-overlay-hover, transparent)' : 'transparent',
        }}
      >
        <svg width="12" height="16" viewBox="0 0 14 18" aria-hidden="true">
          <path
            d="M3 2H11V15L7 12L3 15Z"
            fill={props.selected ? 'currentColor' : 'none'}
            stroke="currentColor"
            stroke-width="1.5"
          />
        </svg>
      </button>
    </span>
  )
}
