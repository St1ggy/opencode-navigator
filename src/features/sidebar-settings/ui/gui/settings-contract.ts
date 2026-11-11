import type { PreferencesController } from '../../../../entities/preferences/model'
import type { QuickActionId } from '../../../../shared/config'
import type { GuiAboutServices } from './about-contract'
import type { Ui } from '@opencode/plugin/gui'

export type GuiSettingsServices = {
  ui: Ui
  preferences: PreferencesController
  presentation(): 'panel' | 'floating'
  setPresentation(value: 'panel' | 'floating'): void
  resetWindow(): void
  configureToolbar(): void
  about: GuiAboutServices
  showGuide?(): void
  hostSettings(): void
  catalogs: {
    skills(): readonly { name: string; location?: string }[]
    mcpServers(): readonly string[]
    actions(): readonly { id: QuickActionId; label: string }[]
  }
  reset(kind: 'layout' | 'behavior' | 'mcp' | 'trust'): Promise<void>
  presets: {
    layout(name: string): void
    mcp(): void
    saveMcp(name: string): Promise<void>
    manage(kind: 'layout' | 'mcp', name: string, operation: 'rename' | 'update' | 'delete'): Promise<void>
    export(): Promise<void>
    import(): void
    project(): void
  }
}
