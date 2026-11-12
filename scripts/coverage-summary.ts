import { appendFile } from 'node:fs/promises'

import { mergeLineCoverage, parseLineCoverage, summarizeLineCoverage } from './lib/line-coverage'

const root = process.cwd()
const names = ['tui', 'gui'] as const
const reports = await Promise.all(
  names.map(async (name) => {
    const text = await Bun.file(`coverage/${name}/lcov.info`).text()

    return parseLineCoverage(text, root)
  }),
)
const combined = mergeLineCoverage(reports)
const summaries = reports.map((report, index) => ({ suite: names[index], ...summarizeLineCoverage(report) }))
const summary = {
  scope:
    'Executable src/ lines loaded by the primary and GUI unit/render suites; excludes packaged host smokes and unimported source files.',
  suites: summaries,
  combined: summarizeLineCoverage(combined),
}
const rows = [...summaries, { suite: 'Combined unique lines', ...summary.combined }]
const markdown = [
  '## Unit/render source-line coverage',
  '',
  '| Suite | Loaded sources | Covered lines | Executable lines | Line coverage |',
  '| --- | ---: | ---: | ---: | ---: |',
  ...rows.map(
    (row) => `| ${row.suite} | ${row.sources} | ${row.covered} | ${row.total} | ${row.percent.toFixed(2)}% |`,
  ),
  '',
  summary.scope,
  'Shared lines are counted once and covered if either suite hits them. Branch coverage is not reported by these Bun LCOV files.',
  '',
].join('\n')

await Bun.write('coverage/summary.json', `${JSON.stringify(summary, null, 2)}\n`)
await Bun.write('coverage/summary.md', markdown)
console.log(markdown)

if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown)
