import { spawn } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

// A local invocation must fail before building, starting Docker or making captures.
if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('GUI screenshots run only in manual Prepare Release CI')

const mode = process.argv[2] ?? 'generate'

if (!['generate', '--verify'].includes(mode)) throw new Error('Usage: capture-gui-screenshots.mjs [--verify]')

const root = resolve(import.meta.dirname, '..')
const committed = join(root, 'screenshots/gui')
const output = mode === '--verify' ? await mkdtemp(join(tmpdir(), 'navigator-gui-captures-')) : committed
const normal = [
  '01-desktop-panel',
  '02-desktop-search-skills',
  '03-desktop-skill-confirmation',
  ...Array.from({ length: 6 }, (_, index) => `04-desktop-onboarding-${index + 1}`),
  '05-desktop-bug-report',
  '06-desktop-report-confirmation',
  '07-desktop-layout-preview',
  '08-desktop-workspace-profile',
  '09-desktop-import-preview',
  '10-desktop-project-profile',
  '11-desktop-mcp-preview',
  '12-desktop-todo-enablement',
  '13-desktop-mini-window-dark',
  '14-desktop-mini-window',
  '15-desktop-icon-picker',
  '16-desktop-toolbar-manager',
  '30-desktop-todo-states',
  '31-desktop-update-stages',
  '32-desktop-mcp-switches',
  '33-desktop-settings-layout',
  '33-desktop-settings-behavior',
  '33-desktop-settings-quick-actions',
  '33-desktop-settings-skills',
  '33-desktop-settings-mcp',
  '33-desktop-settings-presets',
  '33-desktop-settings-about',
  '33-desktop-code-mode-activity',
  '34-desktop-code-mode-payloads',
  '35-desktop-code-mode-routing-preview',
]
const quota = [
  '01-desktop-panel',
  '02-desktop-search-skills',
  '03-desktop-skill-confirmation',
  '17-desktop-account-link',
  '18-desktop-limits',
  '19-desktop-reset-credits',
  '20-desktop-reset-confirmation',
  '21-desktop-credit-expiry',
]
const expected = [...normal, ...quota.map((name) => `quota-${name}`)].map((name) => `${name}.png`).sort()

await mkdir(output, { recursive: true })

for (const quotaMode of ['0', '1']) {
  await new Promise((done, fail) => {
    const child = spawn(process.execPath, ['run', 'test:e2e:gui'], {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, NAVIGATOR_GUI_CAPTURE_DIR: output, NAVIGATOR_GUI_QUOTA_FIXTURE: quotaMode },
    })

    child.once('error', fail)
    child.once('close', (code) => (code === 0 ? done() : fail(new Error(`Desktop capture smoke exited ${code}`))))
  })
}

const files = await readdir(output)
const actual = files.filter((name) => name.endsWith('.png')).sort()

if (JSON.stringify(expected) !== JSON.stringify(actual))
  throw new Error('Desktop capture inventory differs from the reviewed synthetic scene list')

if (mode === '--verify') {
  const differences = []

  for (const name of expected) {
    const [before, after] = await Promise.all([readFile(join(committed, name)), readFile(join(output, name))])

    if (before.equals(after)) continue

    const diagnostics = join(committed, 'verification-failure')

    await mkdir(diagnostics, { recursive: true })
    await copyFile(join(committed, name), join(diagnostics, `expected-${name}`))
    await copyFile(join(output, name), join(diagnostics, `actual-${name}`))
    differences.push(name)
  }

  if (differences.length > 0) throw new Error(`Desktop screenshots are not reproducible: ${differences.join(', ')}`)
}

console.log(`Verified ${expected.length} synthetic Desktop capture scenes (${mode}).`)
