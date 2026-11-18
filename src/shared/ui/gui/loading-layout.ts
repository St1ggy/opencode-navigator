export type LoadingRect = { x: number; y: number; width: number; height: number }
export type LoadingLayout = { width: number; height: number; rects: readonly LoadingRect[] }
export type LoadingLayoutCache = {
  read(key: string): LoadingLayout | undefined
  write(key: string, layout: LoadingLayout): void
}

// Only numeric geometry leaves this function; labels and input values are never cached.
export function readLoadingLayout(root: HTMLElement): LoadingLayout {
  const bounds = root.getBoundingClientRect()
  const rects: LoadingRect[] = []
  const controls = 'button, input, textarea, select, [role="switch"], svg'
  const add = (rect: DOMRect) => {
    const x = Math.max(0, rect.left - bounds.left)
    const y = Math.max(0, rect.top - bounds.top)
    const width = Math.min(rect.right, bounds.right) - bounds.left - x
    const height = Math.min(rect.bottom, bounds.bottom) - bounds.top - y

    if (width > 1 && height > 1 && rects.length < 256) rects.push({ x, y, width, height })
  }

  for (const node of root.querySelectorAll(controls)) {
    if (!node.parentElement?.closest(controls)) add(node.getBoundingClientRect())
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim() || node.parentElement?.closest(controls)) continue

    const range = document.createRange()

    range.selectNodeContents(node)
    for (const rect of range.getClientRects()) add(rect)
  }

  return { width: bounds.width, height: bounds.height, rects }
}
