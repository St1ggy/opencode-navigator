import { Show, onCleanup, onMount, untrack } from 'solid-js'

import { GuiNotice } from '../../../../shared/ui/gui'
import { executePayloadLabel } from '../../model'

import type { ExecuteInspector } from '../../model'
import type { Ui } from '@opencode/plugin/gui'

export function GuiExecutePayload(props: { ui: Ui; model: ExecuteInspector }) {
  const Code = props.ui.Code
  const key = untrack(() => props.model.key())
  const position = untrack(() => props.model.position(key))
  let body: HTMLDivElement | undefined
  let content: HTMLDivElement | undefined
  let pending = position > 0
  let top = position
  let observer: ResizeObserver | undefined

  function restore() {
    if (!pending || !body || body.scrollHeight - body.clientHeight < position) return

    body.scrollTop = position
    pending = false
    observer?.disconnect()
  }

  function interact() {
    pending = false
    observer?.disconnect()
  }

  onMount(() => {
    if (!pending || !content) return

    observer = new ResizeObserver(restore)
    observer.observe(content)
    restore()
  })
  onCleanup(() => {
    observer?.disconnect()
    props.model.savePosition(key, top)
  })

  return (
    <div
      ref={(node) => {
        body = node
      }}
      tabIndex={0}
      aria-label={`Execute ${executePayloadLabel(props.model.tab()).toLowerCase()}`}
      onWheel={interact}
      onPointerDown={interact}
      onKeyDown={interact}
      onScroll={(event) => {
        if (pending) return

        top = event.currentTarget.scrollTop
        props.model.savePosition(key, top)
      }}
      style={{
        height: 'clamp(100px, 34vh, 320px)',
        overflow: 'auto',
        'min-width': '0',
        'font-size': '12px',
        padding: '12px',
        border: '1px solid var(--v2-border-border-base)',
        'border-radius': '8px',
        'overflow-anchor': 'none',
      }}
    >
      <div
        ref={(node) => {
          content = node
        }}
      >
        <Show
          when={props.model.content().available}
          fallback={
            <GuiNotice ui={props.ui} title={`${executePayloadLabel(props.model.tab())} is unavailable`}>
              This payload has not been exposed by the host.
            </GuiNotice>
          }
        >
          <Code content={props.model.content().text} language={props.model.content().language} />
        </Show>
      </div>
    </div>
  )
}
