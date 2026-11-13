export function GuiQuotaMetric(props: { kind: 'quota' | 'time'; name: string; value: string }) {
  return (
    <div
      data-navigator-quota-label={props.kind}
      style={{
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'min-width': '0',
        'font-size': '12px',
      }}
    >
      <span
        role="img"
        aria-label={props.name}
        title={props.name}
        style={{ display: 'inline-flex', 'flex-shrink': '0' }}
      >
        {/* The public Desktop 2.2.6 catalog has neither a gauge nor a clock. */}
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
        >
          <path
            d={
              props.kind === 'quota'
                ? 'M4 18a9 9 0 1 1 16 0H4ZM12 14l5-6M6 11H4M12 5V3M18 11h2'
                : 'M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0ZM12 7v5l3 2'
            }
          />
        </svg>
      </span>
      <span style={{ 'flex-shrink': '0', 'font-variant-numeric': 'tabular-nums' }}>{props.value}</span>
    </div>
  )
}
