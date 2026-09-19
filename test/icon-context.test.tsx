/** @jsxImportSource @opentui/solid */
import { testRender } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { type JSX, Show, createSignal } from 'solid-js'

import { useDialogs } from '../src/dialogs/context'
import { IconProvider, useIcons } from '../src/icons/context'
import { type IconStyle, uiIcon } from '../src/icons/ui'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

function Consumer(props: { name: string }) {
  const icons = useIcons()

  return (
    <text>
      {props.name} {icons.icon('checked')} {icons.key('up/down')}
    </text>
  )
}

test('icon providers remain reactive and isolated from each other', async () => {
  const [first, setFirst] = createSignal<IconStyle>('nerd')
  const [second, setSecond] = createSignal<IconStyle>('text')
  const setup = await testRender(
    () => (
      <box>
        <IconProvider style={first}>
          <Consumer name="one" />
        </IconProvider>
        <IconProvider style={second}>
          <Consumer name="two" />
        </IconProvider>
      </box>
    ),
    { width: 50, height: 3 },
  )

  try {
    await setup.flush()
    expect(setup.captureCharFrame()).toContain(`one ${uiIcon('checked')}`)
    expect(setup.captureCharFrame()).toContain('two [x] up/down')
    setFirst('text')
    setSecond('nerd')
    await setup.flush()
    expect(setup.captureCharFrame()).toContain('one [x] up/down')
    expect(setup.captureCharFrame()).toContain(`two ${uiIcon('checked')}`)
  } finally {
    setup.renderer.destroy()
  }
})

test('host-mounted and nested dialogs retain a live icon context after the launcher unmounts', async () => {
  const [style, setStyle] = createSignal<IconStyle>('text')
  const [visible, setVisible] = createSignal(true)
  const [modal, setModal] = createSignal<() => JSX.Element>()
  const api = {
    keymap: { registerLayer: () => () => {} },
    ui: { dialog: { replace: (render: () => JSX.Element) => setModal(() => render), setSize() {} } },
  } as unknown as TuiPluginApi
  let launch!: () => void
  let next!: () => void

  function Dialog() {
    const replace = useDialogs(api).open

    next = () => replace(() => <Consumer name="nested" />)

    return <Consumer name="dialog" />
  }
  function Launcher() {
    const replace = useDialogs(api).open

    launch = () => replace(() => <Dialog />)

    return <box />
  }
  const setup = await testRender(
    () => (
      <box>
        <Show when={visible()}>
          <IconProvider style={style}>
            <Launcher />
          </IconProvider>
        </Show>
        <Show keyed when={modal()}>
          {(render) => render()}
        </Show>
      </box>
    ),
    { width: 50, height: 3 },
  )

  try {
    await setup.flush()
    launch()
    await setup.flush()
    expect(setup.captureCharFrame()).toContain('dialog [x] up/down')
    setVisible(false)
    setStyle('nerd')
    await setup.flush()
    expect(setup.captureCharFrame()).toContain(`dialog ${uiIcon('checked')}`)
    next()
    await setup.flush()
    expect(setup.captureCharFrame()).toContain(`nested ${uiIcon('checked')}`)
    setStyle('text')
    await setup.flush()
    expect(setup.captureCharFrame()).toContain('nested [x] up/down')
  } finally {
    setup.renderer.destroy()
  }
})
