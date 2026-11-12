import { updateProgressView } from './update-progress'

import type { UpdateProgress } from './update-progress'

export function navigatorUpdateAction(input: {
  checking: boolean
  busy: boolean
  available: boolean
  latest?: string
  restart?: string | boolean
  progress?: UpdateProgress
}) {
  if (input.restart)
    return {
      kind: 'restart' as const,
      label: 'Restart OpenCode',
      detail:
        typeof input.restart === 'string'
          ? `Load Navigator ${input.restart} after restarting`
          : 'Restart to load the updated Navigator',
    }

  if (input.progress)
    return {
      kind: 'waiting' as const,
      label: updateProgressView(input.progress).label,
      detail: 'Keep OpenCode open until this step finishes',
    }

  if (input.checking)
    return {
      kind: 'waiting' as const,
      label: 'Checking for updates…',
      detail: 'Checking the published Navigator version',
    }

  if (input.busy)
    return {
      kind: 'waiting' as const,
      label: 'Waiting for confirmation…',
      detail: 'No update starts before confirmation',
    }

  if (input.available)
    return {
      kind: 'update' as const,
      label: 'Update Navigator…',
      detail: input.latest ? `Install ${input.latest}` : 'Review and confirm the available update',
    }

  return { kind: 'check' as const, label: 'Check for updates', detail: 'Check the published Navigator version' }
}
