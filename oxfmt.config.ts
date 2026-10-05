import common from '@st1ggy/linter-config/oxfmt-common'
import { defineConfig } from 'oxfmt'

export default defineConfig({
  ...common,
  // Preserve existing exclusions: generated artifacts, screenshot fixtures, and prose.
  // Private local planning/configuration must also stay outside formatter writes.
  ignorePatterns: [
    ...(common.ignorePatterns ?? []),
    'bun.lock',
    'dist/**',
    'screenshots/**',
    '**/*.md',
    'vibe/**',
    '.opencode/**',
  ],
})
