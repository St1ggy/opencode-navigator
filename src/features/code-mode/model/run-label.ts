import { executeCodeReferences } from './code-references'

import type { ExecuteCodeReferences } from './code-references'
import type { ExecuteRun } from './types'

export function executeReferenceLabel(input: unknown, arrow = '→') {
  const references = executeCodeReferences(input)

  return {
    ...references,
    title:
      references.items.map((item) => `${item.namespace} ${arrow} ${item.method}`).join(' · ') ||
      'MCP / method not identified',
  }
}

export function executeRunTime(run: ExecuteRun) {
  const date = new Date(run.created)

  return Number.isNaN(date.getTime()) ? 'Time unavailable' : date.toLocaleTimeString(undefined, { hour12: false })
}

export function executeRunIdentity(run: ExecuteRun) {
  return `…${run.id.slice(-10)}`
}

export function executeRunCaption(run: ExecuteRun, references: ExecuteCodeReferences) {
  return `${references.items.length > 0 ? 'In code · ' : ''}${run.status}`
}
