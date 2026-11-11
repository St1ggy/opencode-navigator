import { readFile } from 'node:fs/promises'
// Node executes this harness directly.
// oxlint-disable-next-line import-x-js/extensions
import { presetInteractions } from './presets.mjs'
// oxlint-disable-next-line import-x-js/extensions
import { extraSettingsInteractions } from './settings-extras.mjs'
// oxlint-disable-next-line import-x-js/extensions
import { presetManagementInteractions } from './preset-management.mjs'
// oxlint-disable-next-line import-x-js/extensions
import { captureGui } from './capture.mjs'

export async function settingsInteractions(page, panel, command) {
  await command('Navigator settings')
  // Desktop Settings is a native route, not a plugin dialog layer.
  const settings = page

  await settings.getByRole('heading', { name: 'Navigator', exact: true }).waitFor()
  await settings.getByText('Show Limits', { exact: true }).click()
  await page.getByRole('button', { name: 'Back to app', exact: true }).click()
  await panel.getByRole('region', { name: 'Limits', exact: true }).waitFor({ state: 'detached' })
  await command('Navigator settings')
  await settings.getByRole('switch', { name: 'Show Limits', exact: true }).focus()
  await page.keyboard.press('Space')
  await settings.getByRole('textbox', { name: 'Limits refresh in minutes', exact: true }).fill('0')

  if (!(await settings.getByRole('button', { name: 'Save interval', exact: true }).isDisabled()))
    throw new Error('GUI settings accepted a quota interval below one minute')

  await settings.getByRole('textbox', { name: 'Limits refresh in minutes', exact: true }).fill('5')
  await settings.getByRole('button', { name: 'Save interval', exact: true }).click()
  await settings.getByRole('button', { name: 'Save layout as default', exact: true }).click()
  await settings.getByText('Layout default saved for this scope.', { exact: true }).waitFor()
  await settings.getByRole('button', { name: 'Reload preferences', exact: true }).click()
  await settings.getByText('Private preferences reloaded.', { exact: true }).waitFor()
  await settings.getByRole('heading', { name: 'About Navigator', exact: true }).waitFor()
  await settings.getByRole('button', { name: 'Check for updates', exact: true }).click()
  await settings.getByText('This GUI uses a local or unrecognized source.', { exact: false }).waitFor()

  if (!(await settings.getByRole('button', { name: 'Update Navigator', exact: true }).isDisabled()))
    throw new Error('Local packaged GUI fixture offered a package-replacing update')

  await settings.getByRole('heading', { name: 'Changelog', exact: true }).waitFor()
  await settings.getByRole('button', { name: 'Open Navigator guide', exact: true }).click()

  for (let slide = 1; slide < 7; slide++) {
    await page.getByRole('dialog').last().getByText(`Navigator guide · ${slide} of 7`, { exact: true }).waitFor()
    await captureGui(page.getByRole('dialog').last(), `04-desktop-onboarding-${slide}`)
    await page.getByRole('dialog').last().getByRole('button', { name: 'Next', exact: true }).click()
  }

  await page
    .getByRole('dialog')
    .last()
    .getByRole('heading', { name: 'Choose your sidebar sections', exact: true })
    .waitFor()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Back', exact: true }).click()
  await page.getByRole('dialog').last().getByText('Navigator guide · 6 of 7', { exact: true }).waitFor()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Finish', exact: true }).click()
  await settings.getByRole('button', { name: 'Report a bug', exact: true }).click()
  const report = page.getByRole('dialog').last()

  await report.getByRole('textbox', { name: 'Bug report title', exact: true }).fill('Synthetic Desktop report')
  await report
    .getByRole('textbox', { name: 'Bug report body', exact: true })
    .fill('Synthetic report body. No user data.')
  await report.getByText('Ready to send through your authenticated GitHub CLI.', { exact: true }).waitFor()
  await captureGui(report, '05-desktop-bug-report')
  await report.getByRole('button', { name: 'Review direct submission', exact: true }).click()
  await captureGui(page.getByRole('dialog').last(), '06-desktop-report-confirmation')
  await page.getByRole('dialog').last().getByRole('button', { name: 'Cancel', exact: true }).click()

  if (await readFile('/tmp/navigator-synthetic-gh.jsonl', 'utf8').catch(() => ''))
    throw new Error('Cancelling report confirmation sent an issue')

  await report.getByRole('button', { name: 'Review direct submission', exact: true }).click()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Submit Bug report', exact: true }).click()
  await page.getByRole('dialog').last().getByText('Bug report created.', { exact: true }).waitFor()
  const sent = await readFile('/tmp/navigator-synthetic-gh.jsonl', 'utf8')
  const reports = sent
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line))

  if (
    reports.length !== 1 ||
    reports[0].body !== 'Synthetic report body. No user data.' ||
    !reports[0].args.includes('Bug')
  )
    throw new Error('Synthetic reporting sent different content, missed the Bug type, or duplicated submission')

  await page.getByRole('dialog').last().getByRole('button', { name: 'Close', exact: true }).last().click()
  await presetInteractions(page)
  await extraSettingsInteractions(page)
  await presetManagementInteractions(page)
  await page.getByRole('button', { name: 'Back to app', exact: true }).click()
  await panel.getByRole('region', { name: 'Limits', exact: true }).waitFor()
  console.log(
    'Packaged Desktop native settings, immediate visibility, interval validation, scoped save and reload passed.',
  )
}
