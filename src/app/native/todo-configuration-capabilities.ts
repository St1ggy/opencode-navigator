export function todoConfigurationCapabilities(client?: {
  config?: { get?: unknown }
  file?: { read?: unknown }
  experimental?: { file?: { write?: unknown } }
}) {
  const read = typeof client?.config?.get === 'function'

  return {
    read,
    enable: read && typeof client?.file?.read === 'function' && typeof client?.experimental?.file?.write === 'function',
  }
}
