import { For, Show, createSignal } from 'solid-js'

import { createOnboardingSteps } from '../../model'

import { GuiSettingsSections } from './settings-sections'

import type { GuiSettingsServices } from './settings-contract'

const steps = createOnboardingSteps({ nativeTodo: true, lsp: false, permissionMode: false, desktop: true })

export function GuiOnboardingDialog(props: GuiSettingsServices & { close(): void }) {
  const Dialog = props.ui.Dialog
  const Button = props.ui.Button
  const [index, setIndex] = createSignal(0)
  const step = () => steps[index()]

  return (
    <Dialog
      title={step()?.title ?? 'Choose your sidebar sections'}
      description={`Navigator guide · ${index() + 1} of 7`}
      footer={
        <>
          <Button onClick={props.close}>Close guide</Button>
          <Button disabled={index() === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}>
            Back
          </Button>
          <Button variant="contrast" onClick={() => (index() === 6 ? props.close() : setIndex((value) => value + 1))}>
            {index() === 6 ? 'Finish' : 'Next'}
          </Button>
        </>
      }
    >
      <div
        tabIndex={0}
        aria-label="Navigator guide content"
        style={{ 'max-height': 'min(52vh, 560px)', 'overflow-y': 'auto' }}
      >
        <Show when={step()} fallback={<GuiSettingsSections {...props} />}>
          {(value) => (
            <>
              <p>{value().summary}</p>
              <dl>
                <For each={value().features}>
                  {(feature) => (
                    <div style={{ 'margin-top': '16px' }}>
                      <dt>
                        <strong>{feature.title}</strong>
                      </dt>
                      <dd style={{ margin: '4px 0 0' }}>{feature.description}</dd>
                    </div>
                  )}
                </For>
              </dl>
            </>
          )}
        </Show>
      </div>
    </Dialog>
  )
}
