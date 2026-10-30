import { runProcessCommand } from '../process-command'

export async function openExternalUrl(url: string, signal?: AbortSignal) {
  const target = new URL(url)

  if (!['https:', 'http:'].includes(target.protocol) || target.username || target.password) return false

  const programs: Partial<Record<NodeJS.Platform, string[]>> = {
    darwin: ['open', url],
    linux: ['xdg-open', url],
    win32: ['rundll32.exe', 'url.dll,FileProtocolHandler', url],
  }
  const command = programs[process.platform]

  if (!command) return false

  const result = await runProcessCommand(command, '', signal, 4000)

  return result.code === 0
}
