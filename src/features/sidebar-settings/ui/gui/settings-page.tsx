import { For, Show, createEffect, createSignal } from 'solid-js'

import { GuiSettingsSurface, GuiTabs } from '../../../../shared/ui/gui'

import { GuiSettingsAbout } from './settings-about'
import { createSettingsAction } from './settings-action'
import { GuiSettingsBehavior } from './settings-behavior'
import { GuiSettingsCatalogs } from './settings-catalogs'
import { GuiSettingsLayoutDefault } from './settings-layout-default'
import { GuiSettingsPresets } from './settings-presets'
import { GuiSettingsResets } from './settings-resets'
import { GuiSettingsHeaderActions } from './settings-scope'
import { GuiSettingsSections } from './settings-sections'

import type { GuiSettingsServices } from './settings-contract'
import type { IconName } from '@opencode/plugin/gui'

const tabs = [
  { id: 'layout', label: 'Layout', icon: 'layout-right', scoped: true },
  { id: 'behavior', label: 'Behavior', icon: 'sliders', scoped: true },
  { id: 'actions', label: 'Quick Actions', icon: 'terminal', scoped: true },
  { id: 'skills', label: 'Skills', icon: 'graduation-cap', scoped: false },
  { id: 'mcp', label: 'MCP', icon: 'mcp', scoped: true },
  { id: 'presets', label: 'Presets', icon: 'archive', scoped: true },
  { id: 'about', label: 'About', icon: 'info', scoped: false },
] as const satisfies readonly { id: string; label: string; icon: IconName; scoped: boolean }[]

type SettingsTab = (typeof tabs)[number]['id']

export function GuiNavigatorSettings(props: GuiSettingsServices & { target?: string }) {
  const Layout = props.ui.SettingsLayout
  const action = createSettingsAction()
  const [selected, setSelected] = createSignal<SettingsTab>('layout')
  const [visited, setVisited] = createSignal<readonly SettingsTab[]>(['layout'])
  const scoped = () => tabs.find((tab) => tab.id === selected())?.scoped === true
  const select = (id: SettingsTab) => {
    setVisited((current) => (current.includes(id) ? current : [...current, id]))
    setSelected(id)
  }

  createEffect(() => {
    if (props.target === 'navigator-overflow' || props.target === 'navigator-quota-refresh') select('behavior')
  })

  return (
    <Layout
      title="Navigator"
      description="Shared sidebar settings for this Desktop and your local TUI instances."
      actions={
        <Show when={props.preferences.ready() && selected() !== 'about'}>
          <GuiSettingsHeaderActions {...props} scoped={scoped()} action={action} />
        </Show>
      }
    >
      <GuiSettingsSurface>
        <Show when={props.preferences.ready()} fallback={<p role="status">Loading Navigator preferences…</p>}>
          <GuiTabs
            ui={props.ui}
            label="Navigator settings categories"
            selected={selected()}
            options={tabs}
            onSelect={select}
          />
          <Show when={selected() !== 'about' && action.status()}>
            <p role="status">{action.status()}</p>
          </Show>
          <For each={tabs}>
            {(tab) => (
              <Show when={visited().includes(tab.id)}>
                <section
                  hidden={selected() !== tab.id}
                  aria-label={`${tab.label} settings`}
                  style={{ display: selected() === tab.id ? 'grid' : 'none', gap: '24px', 'min-width': '0' }}
                >
                  <Show when={tab.id === 'layout'}>
                    <GuiSettingsSections {...props} />
                    <GuiSettingsLayoutDefault ui={props.ui} preferences={props.preferences} action={action} />
                    <GuiSettingsResets {...props} section="layout" />
                  </Show>
                  <Show when={tab.id === 'behavior'}>
                    <GuiSettingsBehavior {...props} />
                    <GuiSettingsResets {...props} section="behavior" />
                  </Show>
                  <Show when={tab.id === 'actions' || tab.id === 'skills' || tab.id === 'mcp'}>
                    <GuiSettingsCatalogs {...props} section={tab.id as 'actions' | 'skills' | 'mcp'} />
                  </Show>
                  <Show when={tab.id === 'mcp'}>
                    <GuiSettingsResets {...props} section="mcp" />
                  </Show>
                  <Show when={tab.id === 'presets'}>
                    <GuiSettingsPresets {...props} />
                  </Show>
                  <Show when={tab.id === 'about'}>
                    <GuiSettingsAbout ui={props.ui} about={props.about} showGuide={props.showGuide} />
                  </Show>
                </section>
              </Show>
            )}
          </For>
        </Show>
      </GuiSettingsSurface>
    </Layout>
  )
}
