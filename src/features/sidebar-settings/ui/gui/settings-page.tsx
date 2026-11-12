import { For, Show, createEffect, createSignal } from 'solid-js'

import { GuiSettingsSurface, GuiTabs } from '../../../../shared/ui/gui'

import { GuiSettingsAbout } from './settings-about'
import { GuiSettingsBehavior } from './settings-behavior'
import { GuiSettingsCatalogs } from './settings-catalogs'
import { GuiSettingsPresets } from './settings-presets'
import { GuiSettingsResets } from './settings-resets'
import { GuiSettingsScope } from './settings-scope'
import { GuiSettingsSections } from './settings-sections'

import type { GuiSettingsServices } from './settings-contract'

const tabs = [
  { id: 'layout', label: 'Layout' },
  { id: 'behavior', label: 'Behavior' },
  { id: 'actions', label: 'Quick Actions' },
  { id: 'skills', label: 'Skills' },
  { id: 'mcp', label: 'MCP' },
  { id: 'presets', label: 'Presets' },
  { id: 'about', label: 'About' },
] as const

type SettingsTab = (typeof tabs)[number]['id']

export function GuiNavigatorSettings(props: GuiSettingsServices & { target?: string }) {
  const Layout = props.ui.SettingsLayout
  const [selected, setSelected] = createSignal<SettingsTab>('layout')
  const [visited, setVisited] = createSignal<readonly SettingsTab[]>(['layout'])
  const select = (id: SettingsTab) => {
    setVisited((current) => (current.includes(id) ? current : [...current, id]))
    setSelected(id)
  }

  createEffect(() => {
    if (props.target === 'navigator-overflow' || props.target === 'navigator-quota-refresh') select('behavior')
  })

  return (
    <Layout title="Navigator" description="Shared sidebar settings for this Desktop and your local TUI instances.">
      <GuiSettingsSurface>
        <Show when={props.preferences.ready()} fallback={<p role="status">Loading Navigator preferences…</p>}>
          <GuiTabs
            ui={props.ui}
            label="Navigator settings categories"
            selected={selected()}
            options={tabs}
            onSelect={select}
          />
          <GuiSettingsScope {...props} layout={selected() === 'layout'} />
          <For each={tabs}>
            {(tab) => (
              <Show when={visited().includes(tab.id)}>
                <section
                  hidden={selected() !== tab.id}
                  aria-label={`${tab.label} settings`}
                  style={{ display: selected() === tab.id ? 'grid' : 'none', gap: '32px', 'min-width': '0' }}
                >
                  <Show when={tab.id === 'layout'}>
                    <GuiSettingsSections {...props} />
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
