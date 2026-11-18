import { expect } from '@playwright/test'

export async function verifySettingsScroll(page, width, category) {
  const geometry = await page.locator('[data-navigator-settings]').evaluate((surface) => {
    const ancestors = []

    for (let node = surface; node; node = node.parentElement) {
      const rect = node.getBoundingClientRect()
      const style = getComputedStyle(node)

      ancestors.push({
        tag: node.tagName,
        class: node.className,
        height: node.clientHeight,
        content: node.scrollHeight,
        top: rect.top,
        bottom: rect.bottom,
        overflow: style.overflowY,
        position: style.position,
        settingsScreen: node.classList.contains('settings-screen'),
      })
    }

    return {
      viewport: innerHeight,
      documentHeight: document.documentElement.scrollHeight,
      ancestors,
      announcements: [...surface.querySelectorAll('[role="list"][aria-describedby]')]
        .filter((node) => node.getBoundingClientRect().width)
        .map((list) => {
          const help = document.querySelector(`#${CSS.escape(list.getAttribute('aria-describedby'))}`)

          return Boolean(help && list.contains(help) && help.offsetParent === list && help.textContent.trim())
        }),
    }
  })

  const outer = geometry.ancestors.slice(geometry.ancestors.findIndex((node) => node.settingsScreen) + 1)

  for (const node of outer) {
    expect(node.content, `Extra outer scroll at ${width}px/${category}: ${JSON.stringify(node)}`).toBeLessThanOrEqual(
      node.height + 2,
    )
  }
  expect(
    geometry.documentHeight,
    `Outer scroll at ${width}px/${category}: ${JSON.stringify(geometry)}`,
  ).toBeLessThanOrEqual(geometry.viewport + 2)
  expect(
    geometry.announcements.every(Boolean),
    'Reorder instructions must remain accessible and locally positioned',
  ).toBe(true)
  const scroll = await page.locator('[data-navigator-settings]').evaluate((surface) => {
    const screen = surface.closest('.settings-screen')
    const top = screen.getBoundingClientRect().top

    for (let node = surface.parentElement; node && node !== screen; node = node.parentElement) {
      if (getComputedStyle(node).overflowY !== 'auto' || node.scrollHeight <= node.clientHeight + 2) continue

      const previous = node.scrollTop

      node.scrollTop = node.scrollHeight
      const result = {
        moved: node.scrollTop > 0,
        outerShift: screen.getBoundingClientRect().top - top,
        bottomGap: node.getBoundingClientRect().bottom - surface.getBoundingClientRect().bottom,
        padding: Number(getComputedStyle(surface.parentElement).paddingBottom.replace(/px$/u, '')),
      }

      node.scrollTop = previous

      return result
    }
  })

  if (scroll) {
    expect(scroll.moved, 'Native Settings must still scroll to the end').toBe(true)
    expect(scroll.outerShift, 'Native scrolling must not move the Settings screen').toBe(0)
    expect(scroll.bottomGap, 'End of content must remain reachable').toBeGreaterThanOrEqual(-2)
    expect(scroll.bottomGap, 'No blank tail beyond native bottom padding').toBeLessThanOrEqual(scroll.padding + 2)
  }
}
