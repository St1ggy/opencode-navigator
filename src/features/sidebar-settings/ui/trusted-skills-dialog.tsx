import { createMemo } from 'solid-js'

import { PresetMenu } from './preset-menu'

import type { PreferencesController } from '../../../entities/preferences'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

const RESET_ALL = '__reset_all__'

export function TrustedSkillsDialog(props: { api: TuiPluginApi; preferences: PreferencesController }) {
  const options = createMemo(() => {
    const locations = props.preferences.trustedSkillLocations()

    if (locations.length === 0)
      return [
        {
          title: 'Every skill requires confirmation',
          value: 'empty',
          description: 'No trusted skills',
          icon: 'info' as const,
        },
      ]

    return [
      {
        title: 'Require confirmation for all',
        value: RESET_ALL,
        description: `Revoke trust for ${locations.length} skill${locations.length === 1 ? '' : 's'}`,
        icon: 'reset' as const,
      },
      ...locations.map((location) => ({
        title: location.split('/').at(-2) ?? location,
        value: location,
        description: location,
        icon: 'checked' as const,
      })),
    ]
  })

  return (
    <PresetMenu
      api={props.api}
      title="Trusted skills"
      options={options()}
      onSelect={(option) => {
        if (option.value === RESET_ALL) props.preferences.resetSkillConfirmations()
        else if (option.value !== 'empty') props.preferences.revokeSkillConfirmation(option.value)
      }}
    />
  )
}
