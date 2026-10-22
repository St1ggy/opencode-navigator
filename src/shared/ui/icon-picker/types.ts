import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export type IconPickerProps = { api: TuiPluginApi; value: string; onSelect(id: string): void }
