import { TextAttributes } from '@opentui/core'
import { For } from 'solid-js'

import { SelectionBox, Tab } from '../../../shared/ui'
import { SEARCH_GROUPS, SEARCH_SECTIONS } from '../model/search'

import type { SearchDialogController } from '../model/search-dialog-controller'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function SearchHeader(props: { api: TuiPluginApi; model: SearchDialogController }) {
  const model = props.model

  return (
    <>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={model.theme().text} attributes={TextAttributes.BOLD}>
          {model.icons.icon('search')} Search Everything
        </text>
        <text
          fg={model.theme().textMuted}
          onMouseUp={(event) => {
            event.stopPropagation()
            model.dialogs.back()
          }}
        >
          {model.icons.key('esc')}
        </text>
      </box>
      <SelectionBox backgroundColor={model.theme().backgroundElement} height={1}>
        <input
          ref={model.setInput}
          value={model.query()}
          placeholder="Search skills, subagents, MCP, actions..."
          focused
          textColor={model.theme().text}
          focusedTextColor={model.theme().text}
          placeholderColor={model.theme().textMuted}
          backgroundColor="transparent"
          focusedBackgroundColor="transparent"
          onInput={model.setQuery}
        />
      </SelectionBox>
      <box flexDirection="row" flexWrap="wrap" gap={1}>
        <For each={SEARCH_GROUPS}>
          {(tab) => (
            <Tab
              api={props.api}
              selected={model.activeTab() === tab}
              count={`(${model.matches().filter((item) => item.group === tab).length})${model.allErrors().some((source) => source.group === tab) ? ' !' : ''}`}
              id={`${model.prefix}.tab.${tab.toLowerCase()}`}
              paddingLeft={1}
              paddingRight={1}
              onMouseDown={(event) => {
                event.preventDefault()
                event.stopPropagation()
              }}
              onMouseUp={(event) => {
                event.stopPropagation()
                model.selectTab(tab)
              }}
            >
              {model.icons.section(SEARCH_SECTIONS[tab])} {tab}
            </Tab>
          )}
        </For>
      </box>
    </>
  )
}
