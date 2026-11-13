import { gui } from '@opencode/plugin/gui/vite'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'

import metadata from './package.json' with { type: 'json' }
import { guiBuildBoundary } from './scripts/gui-build-boundary.ts'

const changelog = readFileSync(new URL('CHANGELOG.md', import.meta.url), 'utf8')

export default defineConfig({
  plugins: [guiBuildBoundary(), gui()],
  define: {
    __NAVIGATOR_VERSION__: JSON.stringify(metadata.version),
    __NAVIGATOR_CHANGELOG__: JSON.stringify(changelog),
  },
  // Only the DOM/CommonJS delivery uses Vite's production minifier. The separate
  // OpenTUI build remains unminified and retains its independent raw-byte budget.
  build: { minify: 'oxc' },
})
