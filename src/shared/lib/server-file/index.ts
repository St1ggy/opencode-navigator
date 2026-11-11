// Route an absolute server-owned file without interpreting it on the renderer's OS.
export function serverFileTarget(path: string) {
  const windows = /^[a-z]:[\\/]|^\\\\/iu.test(path)
  const absolute = windows ? /^[a-z]:[\\/]|^\\\\[^\\/]+[\\/][^\\/]+[\\/]/iu.test(path) : path.startsWith('/')
  const pieces = path.split(windows ? /[\\/]/u : /\//u)
  const index = windows ? Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) : path.lastIndexOf('/')
  const file = path.slice(index + 1)

  if (!absolute || path.includes('\0') || !file || pieces.some((piece) => piece === '.' || piece === '..'))
    throw new Error('OpenCode returned an unsafe or non-absolute configuration path.')

  let directory = path.slice(0, index)

  if (index === 0) directory = '/'
  else if (windows && index === 2) directory = path.slice(0, 3)

  return { location: { directory }, path: file }
}
