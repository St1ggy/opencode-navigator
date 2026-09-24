import { For, Show, createSignal } from 'solid-js'

import { SkillDialog } from '../../../entities/skill'
import { PLUGIN_ID } from '../../../shared/config'
import { useDialogs } from '../../../shared/ui'
import { createSkillSectionModel } from '../model/skill-section-model'

import { ListVisibilityControl } from './list-visibility'
import { SectionRequestBody } from './request-body'
import { Section } from './section'
import { SectionFilter } from './section-filter'
import { SidebarRowList } from './sidebar-row-list'
import { SkillRow } from './skill-row'

import type { PreferencesController } from '../../../entities/preferences'
import type { SkillController, SkillInfo } from '../../../entities/skill'
import type { SidebarInteraction } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function SkillsSection(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  controller: SkillController
  preferences: PreferencesController
  navigationSection?: number
}) {
  const dialogs = useDialogs(props.api)
  const [query, setQuery] = createSignal('')
  const model = createSkillSectionModel(props, query)
  const navigationSection = () => props.navigationSection ?? 3

  function selectSkill(item: SkillInfo) {
    if (!props.preferences.shouldConfirmSkill(item)) {
      void model.useSkill(item)

      return
    }

    showSkillDetails(item)
  }

  function showSkillDetails(item: SkillInfo) {
    dialogs.open(() => (
      <SkillDialog
        api={props.api}
        skill={item}
        favorite={props.preferences.isFavoriteSkill?.(item) ?? false}
        favoriteDisabled={props.preferences.ready?.() === false}
        onToggleFavorite={() => props.preferences.toggleFavoriteSkill?.(item)}
        onAccept={(skipConfirmation) => {
          if (skipConfirmation) props.preferences.skipSkillConfirmation(item)

          void model.useSkill(item)
        }}
      />
    ))
  }

  return (
    <Section
      api={props.api}
      interaction={props.interaction}
      sectionId={`${PLUGIN_ID}.section.skills`}
      navigationSection={navigationSection()}
      title="SKILLS"
      section="skills"
      summary={String(model.list().length)}
      open={props.preferences.expanded().skills}
      onToggle={() => props.preferences.toggleSectionExpanded('skills')}
    >
      <SectionRequestBody
        api={props.api}
        interaction={props.interaction}
        id={`${PLUGIN_ID}.retry.skills`}
        position={{ section: navigationSection(), row: 1, column: 0 }}
        state={model.state()}
        hasItems={model.list().length > 0}
        empty="No skills"
        loading="Loading skills…"
        onRetry={() => void props.controller.retry(model.target())}
      >
        <box>
          <SectionFilter
            api={props.api}
            interaction={props.interaction}
            id={`${PLUGIN_ID}.filter.skills`}
            position={{ section: navigationSection(), row: 2, column: 0 }}
            query={query()}
            placeholder="Filter skills..."
            onInput={setQuery}
          />
          <Show
            when={model.filtered().length > 0}
            fallback={<text fg={props.api.theme.current.textMuted}>No matching skills</text>}
          >
            <SidebarRowList density={props.preferences.rowDensity?.() ?? 'compact'}>
              <For each={model.visibility.visible()}>
                {(item, index) => (
                  <SkillRow
                    api={props.api}
                    interaction={props.interaction}
                    item={item}
                    position={{ section: navigationSection(), row: 10 + index(), column: 0 }}
                    onUse={() => selectSkill(item)}
                    recent={model.recent().has(item.location)}
                    favorite={props.preferences.isFavoriteSkill?.(item) ?? false}
                    favoriteDisabled={props.preferences.ready?.() === false}
                    separator={
                      index() > 0 &&
                      model.skillGroup(model.visibility.visible()[index() - 1]) !== model.skillGroup(item)
                    }
                    onToggleFavorite={() => props.preferences.toggleFavoriteSkill?.(item)}
                  />
                )}
              </For>
            </SidebarRowList>
            <ListVisibilityControl
              api={props.api}
              interaction={props.interaction}
              section="skills"
              navigationSection={navigationSection()}
              row={10 + model.visibility.visible().length}
              visibility={model.visibility}
            />
          </Show>
        </box>
      </SectionRequestBody>
    </Section>
  )
}
