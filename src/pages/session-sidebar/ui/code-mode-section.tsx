import { CodeModeActivity } from './code-mode-activity'
import { Section } from './section'

import type { PreferencesController } from '../../../entities/preferences'
import type { SidebarInteraction } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function CodeModeSection(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  interaction?: SidebarInteraction
  navigationSection: number
}) {
  return (
    <Section
      {...props}
      sectionId="navigator.code-mode"
      section="code_mode"
      title="Code Mode"
      summary=""
      open={props.preferences.expanded().code_mode}
      onToggle={() => props.preferences.toggleSectionExpanded('code_mode')}
    >
      <CodeModeActivity {...props} />
    </Section>
  )
}
