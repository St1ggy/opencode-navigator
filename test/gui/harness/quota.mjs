import { readFile, unlink, writeFile } from 'node:fs/promises'
// oxlint-disable-next-line import-x-js/extensions
import { assertNoConfigurationError, captureGui } from './capture.mjs'

export async function quotaInteractions(page, panel, command, preferencesPath) {
  const consumes = async () => {
    const source = await readFile('/tmp/navigator-synthetic-codex-methods.jsonl', 'utf8').catch(() => '')

    return source
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .filter((entry) => entry.method === 'account/rateLimitResetCredit/consume')
  }

  await command('Select synthetic quota model')
  const link = panel.getByRole('button', { name: 'Link Codex account', exact: true })

  await link.waitFor({ timeout: 30_000 })
  await link.click()
  await page.getByRole('dialog').last().getByText('synthetic-account', { exact: true }).waitFor()
  await captureGui(page.getByRole('dialog').last(), '17-desktop-account-link')
  await page.getByRole('dialog').last().getByRole('button', { name: 'Cancel', exact: true }).click()
  const cancelledLink = JSON.parse(await readFile(preferencesPath, 'utf8'))

  if (Object.keys(cancelledLink.user.codexAccountBindings ?? {}).length > 0)
    throw new Error('Cancelled account confirmation persisted a binding')

  await link.click()
  await page.getByRole('dialog').last().getByText('synthetic-account', { exact: true }).waitFor()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Link account', exact: true }).click()
  await panel.getByRole('button', { name: 'Banked Resets', exact: true }).waitFor({ timeout: 30_000 })
  const limits = panel.getByRole('region', { name: 'Limits', exact: true })
  const controls = await limits.getByRole('button').allTextContents()

  if (controls.some((label) => /synthetic-model|Select model|reasoning|effort/iu.test(label)))
    throw new Error('Desktop Limits duplicated the native chat model or effort selector')

  await assertNoConfigurationError(page)
  await captureGui(panel, '18-desktop-limits')
  const linked = JSON.parse(await readFile(preferencesPath, 'utf8'))

  if (!Object.values(linked.user.codexAccountBindings ?? {}).includes('synthetic-account'))
    throw new Error('Confirmed account binding was not saved to the shared private store')

  console.log('Synthetic Desktop account-link cancel and authoritative save passed.')
  console.log('Synthetic account-scoped quota with nullable model metadata loaded.')
  await writeFile('/tmp/navigator-synthetic-credit-details', 'synthetic')
  await panel.getByRole('button', { name: 'Refresh', exact: true }).first().click()
  await panel.getByRole('button', { name: 'Banked Resets', exact: true }).click()
  const detailed = page.getByRole('dialog').last()

  await detailed.getByRole('progressbar', { name: 'Time remaining for Expiring credit', exact: true }).waitFor()
  const value = Number(
    await detailed
      .getByRole('progressbar', { name: 'Time remaining for Expiring credit', exact: true })
      .getAttribute('aria-valuenow'),
  )

  if (value <= 0 || value >= 100) throw new Error('Credit expiry does not reflect the provider grant/expiry lifetime')

  await detailed.getByText('Expiry not supplied by the provider', { exact: true }).waitFor()

  if (
    !(await detailed
      .locator('li')
      .filter({ hasText: 'Expired credit' })
      .getByRole('button', { name: 'Review credit', exact: true })
      .isDisabled())
  )
    throw new Error('Expired credit can still be reviewed for consumption')

  await captureGui(detailed, '21-desktop-credit-expiry')
  await detailed.getByRole('button', { name: 'Close', exact: true }).last().click()
  await unlink('/tmp/navigator-synthetic-credit-details')
  await panel.getByRole('button', { name: 'Refresh', exact: true }).first().click()
  await panel.getByRole('button', { name: 'Banked Resets', exact: true }).click()
  await captureGui(page.getByRole('dialog').last(), '19-desktop-reset-credits')
  await page
    .getByRole('dialog')
    .last()
    .getByRole('button', { name: 'Review next available credit', exact: true })
    .click()
  await captureGui(page.getByRole('dialog').last(), '20-desktop-reset-confirmation')
  await page.getByRole('dialog').last().getByRole('button', { name: 'Cancel', exact: true }).click()

  const cancelled = await consumes()

  if (cancelled.length > 0) throw new Error('Cancelled reset spent a synthetic credit')

  await page
    .getByRole('dialog')
    .last()
    .getByRole('button', { name: 'Review next available credit', exact: true })
    .click()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Use one credit', exact: true }).click()
  await page.getByRole('dialog').last().getByRole('alert').filter({ hasText: 'retry keeps the same attempt' }).waitFor()
  const pending = JSON.parse(await readFile(preferencesPath, 'utf8')).user.pendingResetAttempt
  const first = await consumes()

  if (!pending || first.length !== 1 || first[0].params.idempotencyKey !== pending.idempotencyKey)
    throw new Error('Uncertain reset did not retain its authoritative idempotency key')

  await page.getByRole('dialog').last().getByRole('button', { name: 'Reconcile pending attempt', exact: true }).click()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Reconcile attempt', exact: true }).click()
  await page.getByText('This attempt was already redeemed; no second credit was used.', { exact: true }).waitFor()
  const repeated = await consumes()
  const state = JSON.parse(await readFile('/tmp/navigator-synthetic-codex.json', 'utf8'))
  const saved = JSON.parse(await readFile(preferencesPath, 'utf8'))

  if (
    repeated.length !== 2 ||
    repeated.some((entry) => entry.params.idempotencyKey !== pending.idempotencyKey) ||
    state.keys.length !== 1 ||
    saved.user.pendingResetAttempt
  )
    throw new Error('Reconciliation did not reuse the key, spent twice, or retained a resolved attempt')

  console.log(
    'Synthetic Desktop reset cancel, uncertain outcome and same-key reconciliation passed; one credit consumed.',
  )
}
