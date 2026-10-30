import { untrack } from 'solid-js'

import type { BugReportDraft } from '../model/bug-report-draft'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { InputRenderable, TextareaRenderable } from '@opentui/core'

export function BugReportEditor(props: {
  api: TuiPluginApi
  draft: BugReportDraft
  height: number
  titleRef(node: InputRenderable): void
  bodyRef(node: TextareaRenderable): void
  change(value: Partial<BugReportDraft>): void
  focus(index: number): void
  titleSubmit(): void
  cursor(offset: number): void
}) {
  let body: TextareaRenderable | undefined
  const initialBody = untrack(() => props.draft.body)
  const theme = () => props.api.theme.current

  return (
    <>
      <box>
        <text fg={theme().textMuted}>Issue title</text>
        <input
          id="opencode-navigator.bug-report.title"
          ref={props.titleRef}
          value={props.draft.title}
          placeholder="Describe the problem briefly"
          textColor={theme().text}
          focusedTextColor={theme().text}
          backgroundColor={theme().backgroundPanel}
          focusedBackgroundColor={theme().backgroundElement}
          placeholderColor={theme().textMuted}
          cursorColor={theme().primary}
          on:focused={() => props.focus(0)}
          onInput={(title) => props.change({ title })}
          onSubmit={props.titleSubmit}
        />
      </box>
      <box>
        <text fg={theme().textMuted}>Description, reproduction, and expected behavior</text>
        <textarea
          id="opencode-navigator.bug-report.body"
          ref={(node) => {
            body = node
            untrack(() => props.bodyRef(node))
          }}
          initialValue={initialBody}
          height={props.height}
          wrapMode="word"
          textColor={theme().text}
          focusedTextColor={theme().text}
          backgroundColor={theme().backgroundPanel}
          focusedBackgroundColor={theme().backgroundElement}
          cursorColor={theme().primary}
          on:focused={() => props.focus(1)}
          onContentChange={() => {
            if (body) props.change({ body: body.plainText })
          }}
          onCursorChange={() => {
            if (body) props.cursor(body.cursorOffset)
          }}
        />
      </box>
    </>
  )
}
