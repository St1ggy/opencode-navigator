import { Plugin } from '@opencode/plugin/gui'

import { main } from './main'
import { setup } from './setup'

export default Plugin.define({
  os: ['macos', 'linux', 'windows'],
  i18n: { en: { 'command.version': 'Navigator version' } },
  setup,
  main,
})
