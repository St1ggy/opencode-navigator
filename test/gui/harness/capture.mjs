import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export const capturesEnabled = process.env.NAVIGATOR_GUI_CAPTURE === '1'

export async function assertNoConfigurationError(page) {
  const error = page.getByText('Navigator configuration could not be loaded; use Reload preferences to retry', {
    exact: true,
  })

  if (await error.count()) throw new Error('The synthetic happy path left a Navigator configuration error visible')
}

export function captureArguments() {
  // Partial tile reuse can vary a handful of rounded-edge pixels across fresh
  // processes. Pin rasterization, color and scale, not the comparison tolerance.
  return capturesEnabled
    ? [
        '--disable-gpu-rasterization',
        '--disable-partial-raster',
        '--force-device-scale-factor=1',
        '--force-color-profile=srgb',
      ]
    : []
}

export async function prepareCaptureClock(page, browser) {
  if (!capturesEnabled) return

  await page.clock.setFixedTime(new Date('2026-11-01T12:00:00Z'))
  const session = await browser.newBrowserCDPSession()

  try {
    const info = await session.send('SystemInfo.getInfo')

    console.log('Capture renderer features:', JSON.stringify(info.gpu.featureStatus))
  } finally {
    await session.detach()
  }
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
