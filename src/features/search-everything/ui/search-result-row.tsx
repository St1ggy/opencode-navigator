import { TextAttributes } from '@opentui/core'

import { SelectionBox } from '../../../shared/ui'

import type { SearchDialogController } from '../model/search-dialog-controller'

export function SearchResultRow(props: { model: SearchDialogController; id: string }) {
  const initial = props.model.byID().get(props.id)!
  const item = () => props.model.byID().get(props.id) ?? initial
  const selected = () => props.model.active()?.id === props.id
  const actionIcon = () => {
    const result = item()

    return result.group === 'Actions' ? `${props.model.icons.action(result.command)} ` : ''
  }

  return (
    <SelectionBox
      id={`${props.model.prefix}.${props.id}`}
      height={2}
      marginBottom={1}
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={selected() ? props.model.theme().backgroundElement : undefined}
      onMouseOver={() => props.model.setSelectedID(props.id)}
      onMouseDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      onMouseUp={(event) => {
        event.stopPropagation()
        props.model.activate(props.id)
      }}
    >
      <box overflow="hidden">
        <text
          fg={
            item().disabled
              ? props.model.theme().textMuted
              : selected()
                ? props.model.theme().accent
                : props.model.resultColors().title
          }
          attributes={TextAttributes.BOLD}
          wrapMode="none"
          truncate
          height={1}
        >
          {selected() ? `${props.model.icons.icon('selected')} ` : '  '}
          {actionIcon()}
          {item().title}
        </text>
        <box paddingLeft={item().group === 'Actions' && props.model.icons.style() === 'text' ? 6 : 4} height={1}>
          <text
            fg={props.model.resultColors().description}
            attributes={TextAttributes.DIM}
            wrapMode="none"
            truncate
            height={1}
          >
            {(item().disabled ?? item().description).replaceAll(/\s+/g, ' ')}
          </text>
        </box>
      </box>
    </SelectionBox>
  )
}
