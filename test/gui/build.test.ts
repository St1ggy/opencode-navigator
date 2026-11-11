import { gui } from '@opencode/plugin/gui/vite'
import { expect, test } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { build } from 'vite'

import { guiBuildBoundary } from '../../scripts/gui-build-boundary'

test.each(['@opentui/core', 'bun:ffi', 'web-tree-sitter', '@opencode/plugin/tui', 'solid-js/store/dist/store.js'])(
  'GUI build rejects unsupported runtime import %s',
  async (module) => {
    const directory = await mkdtemp(join(tmpdir(), 'navigator-gui-build-'))
    const entry = join(directory, 'gui.ts')

    try {
      await writeFile(entry, `import * as runtime from ${JSON.stringify(module)}; export default runtime`)
      const request = build({
        configFile: false,
        logLevel: 'silent',
        plugins: [guiBuildBoundary(), gui({ entry, outFile: join(directory, 'bundle.cjs') })],
      })

      await Promise.resolve(expect(request).rejects.toThrow(/not a module.*provides|forbidden in the GUI bundle/u))
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  },
)
