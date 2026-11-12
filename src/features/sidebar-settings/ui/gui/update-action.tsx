import { Show } from 'solid-js'

import { navigatorUpdateAction, updateProgressView } from '../../../../entities/navigator-release/model'
import { GuiProgress } from '../../../../shared/ui/gui'

import type { GuiAboutServices } from './about-contract'
import type { Ui } from '@opencode/plugin/gui'

export function GuiUpdateAction(props: { ui: Ui; about: GuiAboutServices }) {
  const Button = props.ui.Button
  const Icon = props.ui.Icon
  const action = () =>
    navigatorUpdateAction({
      checking: props.about.checking?.() ?? (props.about.busy() && !props.about.progress?.()),
      busy: props.about.busy(),
      available: props.about.available(),
      latest: props.about.latest?.(),
      restart: props.about.restart?.() && (props.about.latest?.() ?? true),
      progress: props.about.progress?.(),
    })
  const progress = () => props.about.progress?.()

  return (
    <div data-navigator-update-control style={{ 'min-width': '0', 'max-width': '240px' }}>
      <Show
        when={progress()}
        fallback={
          <Show
            when={action().kind === 'restart'}
            fallback={
              <Button
                busy={action().kind === 'waiting'}
                onClick={() => void (action().kind === 'update' ? props.about.update() : props.about.check())}
              >
                {action().label}
              </Button>
            }
          >
            <span role="status">
              <Icon name="circle-check" /> Restart OpenCode to load the update.
            </span>
          </Show>
        }
      >
        {(value) => <GuiProgress ui={props.ui} label={action().label} value={updateProgressView(value()).fraction} />}
      </Show>
    </div>
  )
}
