import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

type HostCapability = 'todo' | 'lsp'

export type HostCapabilities = Readonly<
  Record<HostCapability, boolean> & { unavailable?: Partial<Record<HostCapability, string>> }
>

const defaults: HostCapabilities = { todo: true, lsp: true }
const capabilities = new WeakMap<TuiPluginApi, HostCapabilities>()

export function setHostCapabilities(api: TuiPluginApi, value: HostCapabilities) {
  capabilities.set(api, value)
}

export function hostCapabilities(api: TuiPluginApi) {
  return capabilities.get(api) ?? defaults
}

export function hostCapabilityUnavailable(api: TuiPluginApi, section: string) {
  return section === 'todo' || section === 'lsp' ? hostCapabilities(api).unavailable?.[section] : undefined
}

export function supportsSidebarSection(api: TuiPluginApi, section: string) {
  const current = hostCapabilities(api)

  return section !== 'todo' && section !== 'lsp' ? true : current[section]
}
