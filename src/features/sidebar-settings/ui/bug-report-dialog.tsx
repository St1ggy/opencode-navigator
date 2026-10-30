import { useTerminalDimensions } from '@opentui/solid'
import { For } from 'solid-js'

import { DialogAction, DialogHeader, DialogSurface } from '../../../shared/ui'
import { createBugReportDialogController } from '../model/bug-report-dialog-controller'

import { BugReportEditor } from './bug-report-editor'

import type { BugReportController } from '../model/bug-report-controller'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function BugReportDialog(props: { api: TuiPluginApi; controller: BugReportController }) {
  const model = createBugReportDialogController(props.api, props.controller)
  const dimensions = useTerminalDimensions()

  return (
    <DialogSurface api={props.api} lift>
      <DialogHeader api={props.api} title="Report a bug" icon="bug" onBack={model.dialogs.back} />
      <BugReportEditor
        api={props.api}
        draft={props.controller.draft()}
        height={Math.max(3, Math.min(8, dimensions().height - 21))}
        titleRef={model.titleRef}
        bodyRef={model.bodyRef}
        change={props.controller.change}
        cursor={model.setCursor}
        focus={model.editorFocus}
        titleSubmit={model.titleSubmit}
      />
      <text height={1} truncate wrapMode="none" fg={props.api.theme.current.textMuted}>
        {model.status()}
      </text>
      <box id="opencode-navigator.bug-report.actions" ref={model.actionsRef} focusable>
        <For each={[0, 1, 2, 3]}>
          {(index) => (
            <DialogAction
              api={props.api}
              id={`opencode-navigator.bug-report.action.${index}`}
              label={model.options()[index].label}
              icon={model.options()[index].icon}
              disabled={model.options()[index].disabled}
              selected={model.selected(index)}
              onSelect={() => model.setHovered(index)}
              onActivate={() => model.activate(index)}
            />
          )}
        </For>
      </box>
    </DialogSurface>
  )
}
