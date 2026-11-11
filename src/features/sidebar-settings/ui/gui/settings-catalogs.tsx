import { For, Show } from 'solid-js'

import { GuiGroupControl, GuiSortableList } from '../../../../shared/ui/gui'

import type { GuiSettingsServices } from './settings-contract'

export function GuiSettingsCatalogs(props: GuiSettingsServices) {
  const Section = props.ui.SettingsSection
  const Row = props.ui.SettingsRow
  const Button = props.ui.Button
  const Switch = props.ui.Switch
  const skillGroups = () => [...new Set(Object.values(props.preferences.skillGroups()))].sort()
  const mcpGroups = () => [...new Set(Object.values(props.preferences.mcpServerGroups()))].sort()

  return (
    <>
      <Section
        title="Quick Actions"
        footer="Visibility and order are scoped. Favorites are private and user-wide; usage never reorders actions."
      >
        <GuiSortableList
          ui={props.ui}
          label="Quick Action order"
          items={props.catalogs.actions()}
          itemKey={(action) => action.id}
          itemLabel={(action) => action.label}
          scope={props.preferences.selectedScopeKey()}
          move={(from, to) => props.preferences.reorderQuickAction(from, to, props.preferences.selectedScopeKey())}
        >
          {(action, handle) => (
            <Row
              title={
                <span style={{ display: 'flex', gap: '8px', 'align-items': 'center' }}>
                  {handle}
                  {action().label}
                </span>
              }
            >
              <Switch
                label={`Show action ${action().label}`}
                hideLabel
                checked={props.preferences.selectedQuickActionVisible(action().id)}
                onChange={() => props.preferences.toggleQuickAction(action().id)}
              />
            </Row>
          )}
        </GuiSortableList>
      </Section>
      <Section
        title="Skill groups"
        footer="Assignments use exact source locations and remain private across worktrees. Skills without a source cannot be assigned."
      >
        <For each={props.catalogs.skills()}>
          {(skill) => (
            <Row title={skill.name} description={skill.location ?? 'No exact source location reported by this host.'}>
              <GuiGroupControl
                ui={props.ui}
                label={`${skill.name} (${skill.location ?? 'source unavailable'})`}
                disabled={!skill.location}
                value={skill.location ? props.preferences.skillGroups()[skill.location] : undefined}
                groups={skillGroups()}
                save={(group) => {
                  if (skill.location) props.preferences.setSkillGroup(skill.location, group)
                }}
              />
            </Row>
          )}
        </For>
        <Show when={props.catalogs.skills().length === 0}>
          <Row title="No Skills loaded" description="Open a session to load its native Skill source." />
        </Show>
      </Section>
      <Section
        title="MCP groups"
        footer="One named group per exact server name. Absent server assignments are retained."
      >
        <For each={props.catalogs.mcpServers()}>
          {(name) => (
            <Row title={name}>
              <GuiGroupControl
                ui={props.ui}
                label={name}
                value={props.preferences.mcpServerGroups()[name]}
                groups={mcpGroups()}
                save={(group) => props.preferences.setMcpServerGroup(name, group)}
              />
            </Row>
          )}
        </For>
        <Show when={props.catalogs.mcpServers().length === 0}>
          <Row title="No MCP servers loaded" description="Open a session with configured MCP servers." />
        </Show>
      </Section>
      <Section title="Trusted Skills" footer="Revoking trust restores confirmation. It never runs or removes a Skill.">
        <For each={props.preferences.trustedSkillLocations()}>
          {(location) => (
            <Row title="Trusted Skill source" description={location}>
              <Button onClick={() => props.preferences.revokeSkillConfirmation(location)}>Require confirmation</Button>
            </Row>
          )}
        </For>
        <Show when={props.preferences.trustedSkillLocations().length === 0}>
          <Row title="All Skills require confirmation" />
        </Show>
        <Row title="Reset Skill trust">
          <Button onClick={() => void props.reset('trust')}>Require confirmation for every Skill</Button>
        </Row>
      </Section>
    </>
  )
}
