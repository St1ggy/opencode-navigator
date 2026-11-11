import { chromium } from '@playwright/test'
import { spawn, spawnSync } from 'node:child_process'
import { chmod, copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

// This harness runs directly in Node, outside the repository bundler.
// oxlint-disable-next-line import-x-js/extensions
import { toolbarInteractions } from './toolbar.mjs'
// oxlint-disable-next-line import-x-js/extensions
import { quotaInteractions } from './quota.mjs'
// oxlint-disable-next-line import-x-js/extensions
import { settingsInteractions } from './settings.mjs'
// oxlint-disable-next-line import-x-js/extensions
import { captureGui, capturesEnabled, prepareCaptureClock } from './capture.mjs'
// oxlint-disable-next-line import-x-js/extensions
import { closeProcessPipes } from './cleanup.mjs'

async function nativeLogs(root) {
  // All paths are inside this disposable, synthetic HOME, never the user's state.
  const directory = root
  const files = await readdir(directory, { recursive: true }).catch(() => [])
  const sources = await Promise.all(
    files
      .filter(
        (name) => name.endsWith('.log') && (name.startsWith('desktop/logs/') || name.startsWith('data/opencode/log/')),
      )
      .slice(0, 30)
      .map(async (file) => {
        const source = await readFile(join(directory, file), 'utf8').catch(() => '')

        return `\n[native ${file}]\n${source.slice(-20_000)}`
      }),
  )

  return sources.join('')
}

async function prepareQuotaExecutable(root, enabled) {
  const bin = join(root, 'bin')

  await mkdir(bin, { recursive: true })
  await copyFile('/opt/navigator-smoke/gh-fixture.mjs', join(bin, 'gh'))
  await chmod(join(bin, 'gh'), 0o755)

  if (enabled) {
    await mkdir(bin, { recursive: true })
    await copyFile('/opt/navigator-smoke/codex-fixture.mjs', join(bin, 'codex'))
    await chmod(join(bin, 'codex'), 0o755)
  }

  return `${bin}:${process.env.PATH}`
}

async function main() {
  const root = '/tmp/navigator-desktop-fixture'
  const config = join(root, 'config/opencode')

  await mkdir(config, { recursive: true })
  await mkdir(join(root, 'Default Project'), { recursive: true })
  const install = spawnSync(
    '/usr/bin/npm',
    [
      'install',
      '--prefix',
      root,
      '--ignore-scripts',
      '--omit=optional',
      '--legacy-peer-deps',
      '--no-audit',
      '--no-fund',
      '/input/navigator.tgz',
      '@opencode/plugin@2.2.6',
    ],
    { stdio: 'inherit', timeout: 180_000 },
  )

  if (install.status !== 0) throw new Error('Packaged Navigator fixture install failed')

  const fixture = join(root, 'node_modules/navigator-desktop-fixture')

  await mkdir(fixture, { recursive: true })
  await mkdir('/synthetic/project', { recursive: true })
  const skillDirectory = '/synthetic/project/.opencode/skills/synthetic-monitoring'

  await mkdir(skillDirectory, { recursive: true })
  await writeFile(
    join(skillDirectory, 'SKILL.md'),
    '---\nname: synthetic-monitoring\ndescription: Synthetic monitoring Skill for isolated GUI checks.\n---\n\nOnly synthetic fixture instructions.\n',
  )
  await writeFile(
    join(fixture, 'package.json'),
    JSON.stringify({
      name: 'navigator-desktop-fixture',
      version: '1.0.0',
      type: 'module',
      exports: { './server': './server.js', './gui-experimental': './gui.cjs' },
    }),
  )
  await copyFile('/opt/navigator-smoke/server-fixture.mjs', join(fixture, 'server.js'))
  const quotaFixture = process.env.NAVIGATOR_GUI_QUOTA_FIXTURE === '1'
  const fixturePath = await prepareQuotaExecutable(root, quotaFixture)

  await copyFile('/opt/navigator-smoke/fixture.cjs', join(fixture, 'gui.cjs'))
  const stateDirectory = join(root, 'state')
  const preferencesDirectory = join(stateDirectory, 'opencode/opencode-pretty-sidebar')

  await mkdir(preferencesDirectory, { recursive: true })
  await writeFile(
    join(preferencesDirectory, 'preferences.json'),
    JSON.stringify({
      global: {},
      worktrees: {},
      user: {
        onboardingCompleted: true,
        mcpServerGroups: { 'synthetic-absent': 'Synthetic MCP Group' },
        mcpPresets: { 'Synthetic unavailable': { 'synthetic-missing-server': 'enabled' } },
      },
    }),
  )
  await writeFile(
    join(config, 'opencode.json'),
    JSON.stringify({
      $schema: 'https://opencode.ai/config.json',
      plugins: [
        ...(process.env.NAVIGATOR_GUI_NATIVE_DIALOG_PROBE === '1'
          ? []
          : [{ package: join(root, 'node_modules/opencode-navigator') }]),
        {
          package: fixture,
          options: {
            nativeDialogProbe: process.env.NAVIGATOR_GUI_NATIVE_DIALOG_PROBE === '1',
            quotaFixture,
            captureClock: capturesEnabled,
          },
        },
      ],
      skills: [skillDirectory],
      policies: [
        { action: 'provider.use', resource: '*', effect: 'deny' },
        ...(quotaFixture ? [{ action: 'provider.use', resource: 'synthetic-codex', effect: 'allow' }] : []),
      ],
    }),
  )
  // Verified against the official 2.2.6 Debian package inventory.
  const executable = '/opt/OpenCode/ai.opencode'
  const child = spawn(executable, ['--no-sandbox', '--disable-gpu', '--remote-debugging-port=9222'], {
    env: {
      ...process.env,
      HOME: root,
      PATH: fixturePath,
      XDG_STATE_HOME: stateDirectory,
      OPENCODE_DESKTOP_TEST_ROOT: root,
      OPENCODE_DISABLE_MODELS_FETCH: 'true',
      OPENCODE_DISABLE_AUTOUPDATE: 'true',
      OPENCODE_DISABLE_EXTERNAL_SKILLS: 'true',
      OPENCODE_DISABLE_CLAUDE_CODE_SKILLS: 'true',
      OPENCODE_DISABLE_PROJECT_CONFIG: 'true',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let logs = ''
  let failure

  child.on('error', (error) => {
    failure = error
  })
  for (const stream of [child.stdout, child.stderr])
    stream.on('data', (data) => {
      logs = (logs + data.toString()).slice(-200_000)
    })
  const deadline = Date.now() + 90_000
  let browser
  let page

  try {
    while (Date.now() < deadline) {
      if (failure || child.exitCode !== null) throw failure ?? new Error(`Desktop exited ${child.exitCode}: ${logs}`)

      try {
        const response = await fetch('http://127.0.0.1:9222/json/version')

        if (response.ok) {
          browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
          break
        }
      } catch {
        // The isolated Electron debug endpoint is not ready yet.
      }
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    if (!browser) throw new Error(`Packaged Desktop CDP did not start: ${logs}`)

    const context = browser.contexts()[0]

    page = context.pages()[0]

    while (!page && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 200))
      page = context.pages()[0]
    }

    if (!page) throw new Error('Packaged Desktop did not create a renderer')

    page.on('console', (message) => {
      logs = `${logs}\n[renderer] ${message.text()}`.slice(-200_000)
    })
    page.on('pageerror', (error) => {
      logs = `${logs}\n[renderer error] ${error.message}`.slice(-200_000)
    })
    await prepareCaptureClock(page)
    await page.waitForLoadState('domcontentloaded')
    // The packaged shell's early window precedes its command registration and composer.
    await page.locator('[contenteditable="true"]').first().waitFor({ timeout: 60_000 })
    // Desktop 2.2.6 publishes mod+k/mod+shift+p, not the TUI's Ctrl+P.
    await page.keyboard.press('Control+k')
    const search = page.locator('.command-palette input').first()

    const nativeProbe = process.env.NAVIGATOR_GUI_NATIVE_DIALOG_PROBE === '1'
    const ping = nativeProbe ? 'Synthetic fixture ping' : 'Navigator version'
    const ready = nativeProbe ? 'Synthetic fixture ready' : `Navigator ${process.env.NAVIGATOR_VERSION}`

    await search.fill(ping, { timeout: 60_000 })
    await page.getByText(ping, { exact: true }).last().click()
    await page.getByText(ready, { exact: true }).waitFor({ timeout: 15_000 })

    let fixtureDispatch = false

    async function command(title) {
      console.log(`Desktop command: ${title}`)
      await page.keyboard.press('Escape')
      // In 2.2.6 native dialogs inherit the bottom layer's owner, including its exit animation.
      // Wait for that layer to leave before opening a host-owned command palette.
      await page.locator('[data-dialog-layer]').last().waitFor({ state: 'detached' })

      if (fixtureDispatch) {
        await page.getByRole('button', { name: 'Synthetic fixture commands', exact: true }).click()
        await page.getByRole('menuitem', { name: title, exact: true }).click()

        return
      }

      console.log(`Desktop palette precondition: ${await page.locator('[data-dialog-layer]').count()} dialog layers`)
      await page.keyboard.press('Control+k')
      console.log(`Desktop palette key sent: ${title}`)
      await page.locator('.command-palette input').first().fill(title)
      await page.getByText(title, { exact: true }).last().click()
    }

    if (process.env.NAVIGATOR_GUI_NATIVE_DIALOG_PROBE === '1') {
      await page.getByRole('button', { name: 'Open synthetic native dialog', exact: true }).click()
      await page.getByRole('dialog').last().getByRole('button', { name: 'Close synthetic dialog', exact: true }).click()
      await command(ping)
      await page.getByText(ready, { exact: true }).waitFor()
      console.log('Independent native dialog / command palette probe passed.')
      await command('Create synthetic monitoring session')
      await page.getByRole('button', { name: 'Open synthetic native dialog', exact: true }).click()
      await page.getByRole('dialog').last().getByRole('button', { name: 'Close synthetic dialog', exact: true }).click()
      await command(ping)
      await page.getByText(ready, { exact: true }).waitFor()
      console.log('Independent session native dialog / command palette probe passed.')
      await page.getByRole('button', { name: 'Synthetic probe menu', exact: true }).click()
      await page.getByRole('menuitem', { name: 'Open probe dialog', exact: true }).click()
      await page.getByRole('dialog').last().getByRole('button', { name: 'Close synthetic dialog', exact: true }).click()
      await page.getByRole('button', { name: 'Synthetic tooltip button', exact: true }).hover()
      await command(ping)
      await page.getByText(ready, { exact: true }).waitFor()
      console.log('Independent native Menu / dialog / Tooltip / command palette probe passed.')

      return
    }

    await command('Create synthetic monitoring session')
    await command('Open Navigator')
    const panel = page.locator('[data-navigator-panel]')

    await panel.getByRole('heading', { name: 'Todo', exact: true }).waitFor({ timeout: 30_000 })
    await panel.getByRole('heading', { name: /^Subagents/u }).waitFor()
    await verifyObservedVersion(preferencesDirectory)
    await captureGui(panel, '01-desktop-panel')
    await command('Search Everything in Navigator')
    const navigatorSearch = page.getByRole('dialog').last()
    const query = navigatorSearch.getByRole('textbox', { name: 'Search Navigator', exact: true })

    await query.fill('synthetic-monitoring')
    await captureGui(navigatorSearch, '02-desktop-search-skills')
    await navigatorSearch.getByRole('button', { name: /^synthetic-monitoring/u }).click()
    await page.getByRole('dialog').last().getByRole('button', { name: 'Use Skill', exact: true }).waitFor()
    await captureGui(page.getByRole('dialog').last(), '03-desktop-skill-confirmation')
    await page.keyboard.press('Escape')

    if ((await query.inputValue()) !== 'synthetic-monitoring')
      throw new Error('Nested Skill cancellation lost the Search query')

    await navigatorSearch.getByRole('button', { name: /^Actions/u }).click()
    await query.fill('permissions')
    await navigatorSearch.getByRole('button', { name: /^Permissions settings/u }).waitFor()
    await navigatorSearch.getByRole('button', { name: /^MCP/u }).click()

    if ((await query.inputValue()) !== 'permissions') throw new Error('Search tabs lost the shared query')

    await navigatorSearch.getByRole('button', { name: /^Actions/u }).click()
    await navigatorSearch.getByRole('button', { name: /^Permissions settings/u }).waitFor()
    await page.keyboard.press('Escape')
    console.log('Desktop Search interactions passed; starting toolbar checks.')
    // A separate native-only probe records the 2.2.6 palette-owner defect after session plugin dialogs.
    // Remaining commands use the public Commands.run API through the synthetic fixture, not host internals.
    fixtureDispatch = true

    if (quotaFixture) {
      await quotaInteractions(page, panel, command, join(preferencesDirectory, 'preferences.json'))

      return
    }

    await toolbarInteractions(page, panel, command)
    await settingsInteractions(page, panel, command)
    const mcpSection = panel.getByRole('region', { name: 'MCP', exact: true })

    await mcpSection.getByRole('button', { name: 'Preset', exact: true }).click()
    await page.getByRole('dialog').last().getByRole('button', { name: 'Synthetic unavailable', exact: true }).click()
    await page.getByRole('dialog').last().getByRole('heading', { name: 'Skipped', exact: true }).waitFor()
    await page.getByRole('dialog').last().getByText('synthetic-missing-server', { exact: true }).waitFor()
    await captureGui(page.getByRole('dialog').last(), '11-desktop-mcp-preview')
    await page.keyboard.press('Escape')
    await page.getByRole('dialog').last().getByRole('button', { name: 'Cancel', exact: true }).click()
    await panel.getByRole('button', { name: 'Enable Todo', exact: true }).click()
    const setup = page.getByRole('dialog').last()

    await setup.getByRole('button', { name: 'Preview change', exact: true }).click()
    await page
      .getByRole('dialog')
      .last()
      .getByText('Other settings and comments are preserved.', { exact: false })
      .waitFor()
    await captureGui(page.getByRole('dialog').last(), '12-desktop-todo-enablement')
    await page.keyboard.press('Escape')
    await page.getByRole('dialog').last().getByRole('button', { name: 'Cancel', exact: true }).click()
    const unchanged = JSON.parse(await readFile(join(config, 'opencode.json'), 'utf8'))

    if (unchanged.experimental?.todo) throw new Error('Cancelling Todo preview changed configuration')

    await panel.getByRole('button', { name: 'Enable Todo', exact: true }).click()
    await page.getByRole('dialog').last().getByRole('button', { name: 'Preview change', exact: true }).click()
    await page.getByRole('dialog').last().getByRole('button', { name: 'Enable Todo', exact: true }).click()
    await panel.getByRole('textbox', { name: 'Filter Todo', exact: true }).waitFor({ timeout: 30_000 })
    const enabled = JSON.parse(await readFile(join(config, 'opencode.json'), 'utf8'))

    if (enabled.experimental?.todo !== true || enabled.plugins.length !== unchanged.plugins.length)
      throw new Error('Confirmed Todo enablement failed to preserve unrelated configuration')

    await panel.getByRole('textbox', { name: 'Filter Todo', exact: true }).fill('preserved filter')
    await panel.getByRole('button', { name: 'Legacy archive', exact: true }).click()
    await page.getByRole('dialog').last().getByText('No archived Navigator tasks.', { exact: true }).waitFor()
    await page.keyboard.press('Escape')
    await panel.getByRole('button', { name: 'Float', exact: true }).click()
    const floating = page.locator('[data-navigator-floating]')

    await floating.waitFor()
    await captureGui(floating, '14-desktop-mini-window')

    if ((await floating.getByRole('textbox', { name: 'Filter Todo', exact: true }).inputValue()) !== 'preserved filter')
      throw new Error('Floating view lost shared Todo filter state')

    await floating.getByRole('button', { name: 'Legacy archive', exact: true }).click()
    await page.getByRole('dialog').last().waitFor()

    if (await floating.isVisible()) throw new Error('Floating view overlaps native modal')

    await page.keyboard.press('Escape')
    await floating.waitFor({ state: 'visible' })
    await floating.getByRole('button', { name: 'Move Navigator mini-window', exact: true }).focus()
    await page.keyboard.press('Shift+ArrowLeft')
    await floating.getByRole('button', { name: 'Resize Navigator mini-window', exact: true }).focus()
    await page.keyboard.press('Shift+ArrowDown')
    await floating.getByRole('button', { name: 'Reset position', exact: true }).click()
    await floating.getByRole('button', { name: 'Dock', exact: true }).click()
    await floating.waitFor({ state: 'detached' })
    await panel.getByRole('button', { name: 'Float', exact: true }).click()
    await floating.waitFor()
    await page.setViewportSize({ width: 650, height: 760 })
    await floating.waitFor({ state: 'detached' })
    await page.getByRole('tab', { name: 'More...', exact: true }).click()
    await page.getByRole('button', { name: 'Navigator', exact: true }).click()
    await page
      .locator('[data-navigator-panel]:visible')
      .getByRole('textbox', { name: 'Filter Todo', exact: true })
      .waitFor()
    await page.setViewportSize({ width: 1280, height: 850 })
    await command('Float Navigator')
    await floating.waitFor()
    await command('Close synthetic fixture tabs')
    await floating.waitFor({ state: 'detached' })
    console.log('Packaged Desktop panel, Todo preview/archive and floating keyboard interactions passed.')
    const native = await nativeLogs(root)
    const pluginFailure = /\[plugin\] opencode-navigator\.todo-server (?:AbortError|Error|TypeError)[^\n]*/u.exec(logs)

    if (pluginFailure) throw new Error(`Navigator renderer contribution failed: ${pluginFailure[0]}`)

    if (!native.includes(`Navigator ${process.env.NAVIGATOR_VERSION} Desktop main ready`))
      throw new Error('Packaged Desktop did not execute the Navigator main entry')

    // The GUI command proves renderer setup ran in the packaged host, not a DOM substitute.
    console.log('Packaged OpenCode Desktop GUI smoke passed.')
  } catch (error) {
    console.error(
      'Synthetic renderer state:',
      await page
        ?.locator('body')
        .innerText()
        .catch(() => 'No renderer body'),
    )
    throw error
  } finally {
    await browser?.close().catch(() => {})
    child.kill('SIGTERM')

    if (child.pid && child.exitCode === null && child.signalCode === null) {
      await new Promise((resolve) => {
        const timer = setTimeout(() => {
          child.kill('SIGKILL')
          resolve()
        }, 3000)

        child.once('close', () => {
          clearTimeout(timer)
          resolve()
        })
      })
    }

    closeProcessPipes(child)
    const path = join(root, 'desktop-smoke.log')

    logs += await nativeLogs(root)

    await writeFile(path, logs)
    console.log(logs)
    console.log(`Synthetic Desktop logs: ${path}`)
  }
}

await main()

async function verifyObservedVersion(directory) {
  const preferences = JSON.parse(await readFile(join(directory, 'preferences.json'), 'utf8'))

  if (preferences.user.lastNavigatorVersion !== process.env.NAVIGATOR_VERSION)
    throw new Error('Desktop startup did not persist its observed Navigator version')
}
