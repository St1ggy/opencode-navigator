import { expect, test } from 'bun:test'

import { fitToolbarButtons } from '../../src/features/pinned-toolbar/model'

test('GUI toolbar overflow uses measured bounded widths and reserves the actual More trigger', () => {
  expect(fitToolbarButtons(100, [28, 28, 28], 24)).toBe(3)
  expect(fitToolbarButtons(100, [28, 60, 28], 24)).toBe(1)
  expect(fitToolbarButtons(60, [28, 28, 28], 24)).toBe(1)
  expect(fitToolbarButtons(40, [28, 28], 24)).toBe(0)
  expect(fitToolbarButtons(100, [200], 24)).toBe(1)
  expect(fitToolbarButtons(0, [28], 24)).toBe(0)
  expect(fitToolbarButtons(NaN, [28], 24)).toBe(0)
  expect(fitToolbarButtons(100, [], 24)).toBe(0)
})
