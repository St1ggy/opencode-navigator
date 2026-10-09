import { type ColorInput, RGBA, parseColor } from '@opentui/core'

export function subtleLineColor(background: ColorInput, border: ColorInput): RGBA {
  const from = parseColor(background)
  const to = parseColor(border)

  return RGBA.fromValues(
    from.r + (to.r - from.r) * 0.45,
    from.g + (to.g - from.g) * 0.45,
    from.b + (to.b - from.b) * 0.45,
  )
}
