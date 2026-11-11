export async function verifyFloatingPointer(page, floating, title = false) {
  const handle = title
    ? floating.locator('header strong')
    : floating.getByRole('button', { name: 'Move Navigator mini-window', exact: true })
  const before = await floating.boundingBox()
  const grip = await handle.boundingBox()

  if (!before || !grip) throw new Error('Floating window or move handle has no geometry')

  const dx = before.x > 92 ? -80 : 80
  const dy = before.y > 72 ? -60 : 60

  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2)
  await page.mouse.down()
  await page.mouse.move(grip.x + grip.width / 2 + dx, grip.y + grip.height / 2 + dy, { steps: 8 })
  await page.mouse.up()
  const after = await floating.boundingBox()

  if (!after || Math.abs(after.x - (before.x + dx)) > 2 || Math.abs(after.y - (before.y + dy)) > 2)
    throw new Error(`Floating pointer movement failed: ${JSON.stringify({ before, after })}`)

  console.log(`Floating ${title ? 'title' : 'move handle'} tracks a real pointer drag.`)
}

export async function verifyFloatingTheme(floating) {
  const colors = await floating.evaluate((node) => {
    const style = getComputedStyle(node)
    const probe = document.createElement('div')

    probe.style.backgroundColor = 'var(--v2-background-bg-layer-01)'
    node.append(probe)
    const expected = getComputedStyle(probe).backgroundColor

    probe.remove()

    return { actual: style.backgroundColor, expected }
  })

  if (colors.actual !== colors.expected)
    throw new Error(`Floating window does not use the host surface palette: ${JSON.stringify(colors)}`)
}

export async function verifyFloatingDarkTheme(page, floating) {
  const light = await floating.evaluate((node) => getComputedStyle(node).backgroundColor)

  await page.emulateMedia({ colorScheme: 'dark' })
  await page.waitForFunction((previous) => {
    const node = document.querySelector('[data-navigator-floating]')

    return node && getComputedStyle(node).backgroundColor !== previous
  }, light)
  await verifyFloatingTheme(floating)
  await captureGui(floating, '13-desktop-mini-window-dark')
  await page.emulateMedia({ colorScheme: 'light' })
  await page.waitForFunction((previous) => {
    const node = document.querySelector('[data-navigator-floating]')

    return node && getComputedStyle(node).backgroundColor === previous
  }, light)
  console.log('Floating surface follows the real host theme in light and dark modes.')
}
import { captureGui } from './capture.mjs'
