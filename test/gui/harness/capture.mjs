import { join } from 'node:path'

export const capturesEnabled = process.env.NAVIGATOR_GUI_CAPTURE === '1'

export async function prepareCaptureClock(page) {
  if (capturesEnabled) await page.clock.setFixedTime(new Date('2026-11-01T12:00:00Z'))
}

export async function captureGui(locator, name) {
  if (!capturesEnabled) return

  if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('GUI captures are restricted to the manual CI workflow')

  const prefix = process.env.NAVIGATOR_GUI_QUOTA_FIXTURE === '1' ? 'quota-' : ''

  await locator.screenshot({
    path: join('/captures', `${prefix}${name}.png`),
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
  })
}
