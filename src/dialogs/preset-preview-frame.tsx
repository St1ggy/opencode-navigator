import { useTerminalDimensions } from '@opentui/solid'
import { type JSX, Show, createEffect, createSignal, onCleanup } from 'solid-js'

import { DialogHeader } from '../components/dialog-header'
import { PresetPreviewActions, type PreviewAction } from '../components/preset-preview-actions'
import { type PresetPreviewStat, PresetPreviewSummary } from '../components/preset-preview-summary'
import { PLUGIN_ID } from '../constants'
import { useIcons } from '../icons/context'

import { useDialogScroll, useDialogs } from './context'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { ScrollBoxRenderable } from '@opentui/core'

export function PresetPreviewFrame(props: {
  api: TuiPluginApi
  title: string
  scope: string
  stats: PresetPreviewStat[]
  rowCount: number
  children: JSX.Element
  blocked?: string
  notice?: string
  valid: () => boolean
  onApply: () => void
  onRefresh?: () => void
}) {
  const icons = useIcons()
  const dialogs = useDialogs(props.api)
  const theme = () => props.api.theme.current
  const dimensions = useTerminalDimensions()
  const scroll = useDialogScroll()
  const [active, setActive] = createSignal<PreviewAction>('apply')
  let body: ScrollBoxRenderable | undefined
  const prefix = `${PLUGIN_ID}.preset-preview`

  function activate(action: PreviewAction) {
    if (!props.valid()) {
      dialogs.close()

      return
    }

    if (action === 'cancel') {
      dialogs.back()

      return
    }

    if (props.blocked) return

    try {
      props.onApply()
    } catch (error) {
      props.api.ui.toast({
        variant: 'error',
        title: props.title,
        message: error instanceof Error ? error.message : 'Could not apply preset',
        duration: 4000,
      })
    }
  }
  const unregister = props.api.keymap.registerLayer({
    mode: 'modal',
    priority: 1000,
    commands: [
      { name: `${prefix}.up`, run: () => body?.scrollBy(-1) },
      { name: `${prefix}.down`, run: () => body?.scrollBy(1) },
      {
        name: `${prefix}.move`,
        run: () => {
          setActive((value) => (value === 'apply' ? 'cancel' : 'apply'))
        },
      },
      { name: `${prefix}.submit`, run: () => activate(active()) },
      { name: `${prefix}.refresh`, run: () => props.onRefresh?.() },
    ],
    bindings: [
      { key: 'up', cmd: `${prefix}.up` },
      { key: 'down', cmd: `${prefix}.down` },
      { key: 'tab', cmd: `${prefix}.move` },
      { key: 'left', cmd: `${prefix}.move` },
      { key: 'right', cmd: `${prefix}.move` },
      { key: 'return', cmd: `${prefix}.submit` },
      { key: 'ctrl+r', cmd: `${prefix}.refresh` },
    ],
  })

  onCleanup(unregister)
  createEffect(() => {
    if (!props.valid()) dialogs.close()
  })

  return (
    <box
      paddingLeft={2}
      paddingRight={2}
      paddingBottom={1}
      gap={1}
      marginTop={-Math.min(6, Math.floor(dimensions().height / 10))}
    >
      <DialogHeader api={props.api} title={props.title} onBack={dialogs.back} />
      <box flexDirection="row" gap={1}>
        <text flexShrink={0} fg={theme().accent}>
          {icons.icon('scope')} Scope
        </text>
        <text flexGrow={1} fg={theme().textMuted} wrapMode="none" truncate height={1}>
          {props.scope}
        </text>
      </box>
      <PresetPreviewSummary api={props.api} stats={props.stats} />
      <scrollbox
        ref={(node) => {
          body = node
          scroll.ref(node)
        }}
        renderBefore={scroll.restore}
        renderAfter={scroll.save}
        height={Math.min(Math.max(2, Math.floor(dimensions().height * 0.75) - 14), Math.max(1, props.rowCount * 3 - 1))}
        scrollX={false}
        contentOptions={{ minHeight: 0 }}
      >
        <box gap={1}>{props.children}</box>
      </scrollbox>
      <Show when={props.blocked || props.notice}>
        <box flexDirection="row" gap={1}>
          <text flexShrink={0} fg={props.blocked ? theme().warning : theme().accent}>
            {icons.icon(props.blocked ? 'error' : 'info')}
          </text>
          <text flexGrow={1} fg={props.blocked ? theme().warning : theme().textMuted} wrapMode="word" height={2}>
            {props.blocked || props.notice}
          </text>
        </box>
      </Show>
      <PresetPreviewActions
        api={props.api}
        prefix={prefix}
        active={active()}
        disabled={Boolean(props.blocked)}
        onSelect={setActive}
        onActivate={activate}
        onRefresh={props.onRefresh}
      />
      <text fg={theme().textMuted}>
        {icons.key('up/down')} scroll · {icons.key('tab')} select · {icons.key('enter')} confirm
      </text>
    </box>
  )
}
