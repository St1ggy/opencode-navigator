import { expect, test } from 'bun:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { mergeLineCoverage, parseLineCoverage, summarizeLineCoverage } from '../scripts/lib/line-coverage'

const root = '/synthetic/project'
const report = (path: string, lines: string) => `TN:\nSF:${path}\n${lines}\nend_of_record\n`

test('coverage merges overlapping source lines rather than averaging suite percentages', () => {
  const tui = parseLineCoverage(report('src/shared.ts', 'DA:1,1\nDA:2,0'), root)
  const gui = parseLineCoverage(report(`${root}/src/shared.ts`, 'DA:1,0\nDA:2,4\nDA:3,0'), root)

  expect(summarizeLineCoverage(tui)).toEqual({ sources: 1, covered: 1, total: 2, percent: 50 })
  expect(summarizeLineCoverage(mergeLineCoverage([tui, gui]))).toEqual({
    sources: 1,
    covered: 2,
    total: 3,
    percent: 66.67,
  })
})

test('coverage only reports executable src lines and retains uncovered lines', () => {
  const text = [
    report('test/fixture.ts', 'DA:1,1'),
    report('dist/tui.js', 'DA:1,1'),
    report('../private.ts', 'DA:1,1'),
    report('src/types.d.ts', 'DA:1,1'),
    report('src/empty.ts', ''),
    report('src/actual.ts', 'DA:1,0\nDA:1,2\nDA:2,0'),
  ].join('')

  expect(summarizeLineCoverage(parseLineCoverage(text, root))).toEqual({
    sources: 1,
    covered: 1,
    total: 2,
    percent: 50,
  })
  expect(() => summarizeLineCoverage(parseLineCoverage('', root))).toThrow('no executable')
})

test.each(['DA:0,1', 'DA:1,-1', 'DA:x,1', 'DA:1,Infinity', 'DA:999999999999999999,1'])(
  'invalid coverage data fails instead of producing a green percentage: %s',
  (line) => {
    expect(() => parseLineCoverage(report('src/actual.ts', line), root)).toThrow('LCOV')
  },
)

test('the coverage command writes a real union summary and GitHub job summary', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'navigator-coverage-summary-'))

  try {
    await Bun.write(join(directory, 'coverage/tui/lcov.info'), report('src/shared.ts', 'DA:1,1\nDA:2,0'))
    await Bun.write(join(directory, 'coverage/gui/lcov.info'), report('src/shared.ts', 'DA:1,0\nDA:2,1\nDA:3,0'))
    const summaryPath = join(directory, 'job-summary.md')
    const child = Bun.spawn([process.execPath, new URL('../scripts/coverage-summary.ts', import.meta.url).pathname], {
      cwd: directory,
      env: { ...process.env, GITHUB_STEP_SUMMARY: summaryPath },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const [exit, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])

    expect(stderr).toBe('')
    expect(exit).toBe(0)
    expect(stdout).toContain('66.67%')
    const json = JSON.parse(await readFile(join(directory, 'coverage/summary.json'), 'utf8'))

    expect(json.combined).toMatchObject({ covered: 2, total: 3, percent: 66.67 })
    expect(await readFile(summaryPath, 'utf8')).toContain('Branch coverage is not reported')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
