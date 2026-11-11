import { For, Show } from 'solid-js'

import { isIconChoiceId } from '../../lib/icon-choices'

import type { IconChoiceId } from '../../lib/icon-choices'
import type { IconName, Ui } from '@opencode/plugin/gui'

const native: Partial<Record<IconChoiceId, IconName>> = {
  plus: 'plus',
  check: 'check',
  search: 'magnifying-glass',
  code: 'code',
  terminal: 'terminal',
  gear: 'settings-gear',
  shield: 'shield',
  lock: 'lock',
  eye: 'eye',
  refresh: 'refresh',
  copy: 'copy',
  export: 'share',
  edit: 'edit',
  fork: 'fork',
  list: 'bullet-list',
  stop: 'stop',
  beaker: 'flask',
  server: 'server',
  folder: 'folder',
  file: 'file-document',
  'arrow-up': 'arrow-up',
  warning: 'warning',
  close: 'close',
}

// Simple plugin-owned SVGs cover choices absent from Desktop 2.2.6's public icon catalog.
const paths: Partial<Record<IconChoiceId, readonly string[]>> = {
  circle: ['M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0Z'],
  star: ['m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z'],
  pin: ['m9 3 6 0-1 6 4 4H6l4-4Z', 'M12 13v8'],
  bolt: ['m13 2-8 12h6l-1 8 9-13h-7Z'],
  book: ['M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3Z', 'M12 6v15'],
  unlock: ['M7 10V7a5 5 0 0 1 9-3', 'M5 10h14v11H5Z', 'M12 14v3'],
  clock: ['M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0Z', 'M12 7v5l3 2'],
  history: ['M4 8a9 9 0 1 1-1 7', 'M4 3v5h5', 'M12 7v5l3 2'],
  play: ['m7 4 13 8-13 8Z'],
  pause: ['M8 4v16', 'M16 4v16'],
  rocket: ['M9 16c0-8 6-13 12-13 0 6-5 12-13 12Z', 'm9 8-5 1-2 6 6-1', 'm16 15-1 5-6 2 1-6', 'm5 17-3 5 5-3'],
  bug: [
    'M8 10h8v6a4 4 0 0 1-8 0Z',
    'M9 10V8a3 3 0 0 1 6 0v2',
    'M5 7l3 4M19 7l-3 4M3 14h5m8 0h5M5 21l4-3m6 0 4 3M12 11v9',
  ],
  wand: ['m4 20 13-13 3 3L7 23Z', 'M5 3v6M2 6h6M18 1v4M16 3h4'],
  cloud: ['M7 19a5 5 0 1 1 0-10 6 6 0 0 1 11-1 5.5 5.5 0 0 1 0 11Z'],
  heart: ['M12 21 3.5 12.5a5.5 5.5 0 0 1 8.5-7 5.5 5.5 0 0 1 8.5 7Z'],
  lightbulb: ['M9 18v-2a7 7 0 1 1 6 0v2Z', 'M9 21h6M10 24h4'],
  'arrow-down': ['M12 3v18', 'm5 14 7 7 7-7'],
}

export function GuiIcon(props: { ui: Pick<Ui, 'Icon'>; id: string }) {
  const Icon = props.ui.Icon
  const id = () => (isIconChoiceId(props.id) ? props.id : 'bolt')

  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        width: '18px',
        height: '18px',
        'flex-shrink': '0',
        'align-items': 'center',
        'justify-content': 'center',
      }}
    >
      <Show
        when={native[id()]}
        fallback={
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 26"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <For each={paths[id()] ?? paths.bolt}>{(path) => <path d={path} />}</For>
          </svg>
        }
      >
        {(name) => <Icon name={name()} size="small" />}
      </Show>
    </span>
  )
}
