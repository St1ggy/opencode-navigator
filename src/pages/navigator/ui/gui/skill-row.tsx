import { CatalogRow } from './catalog-row'
import { useNavigatorGui } from './context'

import type { SkillInfo } from '../../../../entities/skill/model'

export function GuiSkillRow(props: { skill: SkillInfo }) {
  const services = useNavigatorGui()
  const preferences = () => services.runtime.catalogs!.preferences
  const Menu = services.ui.Menu
  const pinned = () =>
    preferences()
      .toolbarPins()
      .some((pin) => pin.kind === 'skill' && pin.location === props.skill.location)

  return (
    <CatalogRow
      title={props.skill.name}
      details={props.skill.description}
      favorite={preferences().isFavoriteSkill(props.skill)}
      bookmarkDisabled={!preferences().ready()}
      bookmark={() => preferences().toggleFavoriteSkill(props.skill)}
      activate={() => services.onSkill(props.skill)}
      trailing={
        <Menu
          label={`Options for Skill ${props.skill.name}`}
          items={[
            {
              label: pinned() ? 'Configure toolbar button' : 'Pin to toolbar',
              icon: 'plus',
              disabled: !preferences().ready(),
              onSelect: () =>
                services.onPin({ kind: 'skill', location: props.skill.location, name: props.skill.name, icon: 'book' }),
            },
          ]}
        />
      }
    />
  )
}
