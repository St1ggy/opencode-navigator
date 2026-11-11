import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export const capturesEnabled = process.env.NAVIGATOR_GUI_CAPTURE === '1'

export async function prepareCaptureClock(page) {
  if (capturesEnabled) await page.clock.setFixedTime(new Date('2026-11-01T12:00:00Z'))
}

export async function captureGui(locator, name) {
  if (!capturesEnabled) return

  if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('GUI captures are restricted to the manual CI workflow')

  const prefix = process.env.NAVIGATOR_GUI_QUOTA_FIXTURE === '1' ? 'quota-' : ''

  const frame = await stableFrame(() =>
    locator.screenshot({
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      style: '*, *::before, *::after { transition: none !important; animation: none !important; }',
    }),
  )

  await writeFile(join('/captures', `${prefix}${name}.png`), frame)
}

export async function stableFrame(read) {
  let previous = await read()

  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await read()

    if (previous.equals(current)) return current

    previous = current
  }

  throw new Error('Desktop capture did not settle to two byte-identical frames')
}
