import { relative, resolve } from 'node:path'

export type SourceLineCoverage = Map<string, Map<number, number>>

export function parseLineCoverage(text: string, root: string): SourceLineCoverage {
  const files: SourceLineCoverage = new Map()
  let lines: Map<number, number> | undefined

  for (const record of text.split(/\r?\n/)) {
    if (record.startsWith('SF:')) {
      const path = relative(root, resolve(root, record.slice(3))).replaceAll('\\', '/')

      lines = undefined

      if (!path.startsWith('src/') || path.endsWith('.d.ts')) continue

      lines = files.get(path) ?? new Map()
      files.set(path, lines)
    } else if (record === 'end_of_record') lines = undefined
    else if (lines && record.startsWith('DA:')) {
      const match = /^DA:(\d+),(\d+)(?:,.*)?$/.exec(record)

      if (!match) throw new Error('Malformed LCOV source-line record')

      const line = Number(match[1])
      const hits = Number(match[2])

      if (!Number.isSafeInteger(line) || line < 1 || !Number.isSafeInteger(hits))
        throw new Error('Invalid LCOV line number or hit count')

      lines.set(line, Math.max(lines.get(line) ?? 0, hits))
    }
  }

  return files
}

export function mergeLineCoverage(reports: readonly SourceLineCoverage[]): SourceLineCoverage {
  const merged: SourceLineCoverage = new Map()

  for (const report of reports) {
    for (const [path, lines] of report) {
      const target = merged.get(path) ?? new Map<number, number>()

      for (const [line, hits] of lines) target.set(line, Math.max(target.get(line) ?? 0, hits))

      merged.set(path, target)
    }
  }

  return merged
}

export function summarizeLineCoverage(files: SourceLineCoverage) {
  let total = 0
  let covered = 0
  let sources = 0

  for (const lines of files.values()) {
    if (lines.size > 0) sources++

    for (const hits of lines.values()) {
      total++

      if (hits > 0) covered++
    }
  }

  if (total === 0) throw new Error('Coverage report contains no executable src/ lines')

  return { sources, covered, total, percent: Math.round((covered / total) * 10_000) / 100 }
}
