import { expect, test } from 'bun:test'

import { sectionIcons } from '../../src/pages/navigator/ui/gui/section-icons'
import { SIDEBAR_SECTIONS } from '../../src/shared/config'

test('every sidebar section has a distinct native icon independent of disclosure', () => {
  expect(Object.keys(sectionIcons).toSorted()).toEqual([...SIDEBAR_SECTIONS].toSorted())
  expect(new Set(Object.values(sectionIcons)).size).toBe(SIDEBAR_SECTIONS.length)
  expect(Object.values(sectionIcons).every((name) => !name.startsWith('chevron'))).toBe(true)
})
