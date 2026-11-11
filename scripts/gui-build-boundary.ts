import type { Plugin } from 'vite'

export function guiBuildBoundary(): Plugin {
  return {
    name: 'navigator-gui-boundary',
    enforce: 'pre',
    resolveId(source) {
      if (/^(?:@opentui\/|bun(?::|$)|bun-ffi-structs(?:\/|$)|web-tree-sitter(?:\/|$))/u.test(source))
        throw new Error(`Terminal runtime dependency is forbidden in the GUI bundle: ${source}`)
    },
  }
}
