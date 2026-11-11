export type MiniWindowRect = { x: number; y: number; width: number; height: number }
export type Viewport = { width: number; height: number }

const finite = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback)

export function clampMiniWindow(rect: MiniWindowRect, viewport: Viewport): MiniWindowRect {
  const width = Math.max(0, finite(viewport.width, 0))
  const height = Math.max(0, finite(viewport.height, 0))
  const margin = Math.min(12, width / 2, height / 2)
  const availableWidth = Math.max(0, width - margin * 2)
  const availableHeight = Math.max(0, height - margin * 2)
  const nextWidth = Math.min(availableWidth, Math.max(280, finite(rect.width, 340)))
  const nextHeight = Math.min(availableHeight, Math.max(200, finite(rect.height, 460)))

  return {
    x: Math.min(Math.max(margin, finite(rect.x, margin)), width - margin - nextWidth),
    y: Math.min(Math.max(margin, finite(rect.y, margin)), height - margin - nextHeight),
    width: nextWidth,
    height: nextHeight,
  }
}

export function defaultMiniWindow(viewport: Viewport) {
  return clampMiniWindow({ x: viewport.width - 360, y: 80, width: 340, height: 460 }, viewport)
}
