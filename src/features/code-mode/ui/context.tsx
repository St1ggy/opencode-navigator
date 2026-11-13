import { createContext, useContext } from 'solid-js'

import type { CodeModeController } from '../model'

export const TuiCodeModeContext = createContext<CodeModeController>()
export const useCodeModeTui = () => useContext(TuiCodeModeContext)
