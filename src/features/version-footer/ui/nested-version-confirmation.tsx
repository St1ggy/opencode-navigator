import { onCleanup } from 'solid-js'

import { GuardedConfirmation, SelectionMenu } from '../../../shared/ui'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function NestedVersionConfirmation(props: {
  api: TuiPluginApi
  name: string
  version: string
  current(): boolean
  confirm(): void
  cancel(): void
  dismiss(): void
}) {
  onCleanup(props.dismiss)

  return (
    <GuardedConfirmation
      api={props.api}
      current={props.current}
      title={`Update ${props.name}`}
      message={`Install ${props.version} using the current installation method?`}
      onConfirm={props.confirm}
      render={({ confirm }) => (
        <SelectionMenu
          api={props.api}
          title={`Update ${props.name}`}
          options={[
            { title: 'Cancel', value: 'cancel', description: 'Return without installing an update' },
            {
              title: `Install ${props.name} ${props.version}`,
              value: 'install',
              description: 'Keep the current installation method and scope; restart OpenCode afterward',
            },
          ]}
          onSelect={(option) => (option.value === 'install' ? confirm() : props.cancel())}
        />
      )}
    />
  )
}
