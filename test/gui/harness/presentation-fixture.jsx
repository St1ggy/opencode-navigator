import { Command, Plugin } from '@opencode/plugin/gui'
import { For, createSignal } from 'solid-js'

import { GuiUpdateAction } from '../../../src/features/sidebar-settings/ui/gui/update-action'
import { TodoRow } from '../../../src/pages/navigator/ui/gui/todo-row'
import { GuiProgress } from '../../../src/shared/ui/gui/progress'

import { McpFixture } from './mcp-fixture'
import { QuotaScalesFixture } from './quota-scales-fixture'

// The isolated probe is explicitly CommonJS; Vite does not infer its .cjs suffix.
// oxlint-disable-next-line import/extensions
import fixture from './fixture.cjs'

const base = fixture.default ?? fixture
const tasks = [
  { content: 'Review the synthetic workspace', status: 'completed' },
  { content: 'Verify the current synthetic change', status: 'in_progress' },
  { content: 'Prepare the next synthetic task', status: 'pending' },
  { content: 'Retire the superseded synthetic task', status: 'cancelled' },
]

function UpdateFixture(props) {
  const [stage, setStage] = createSignal('check')
  const about = {
    busy: () => stage() === 'progress',
    checking: () => false,
    available: () => stage() === 'update',
    latest: () => '1.2.4',
    restart: () => stage() === 'restart',
    progress: () => (stage() === 'progress' ? { phase: 'downloading', received: 4, total: 10 } : undefined),
    check: async () => setStage('update'),
    update: async () => setStage('progress'),
  }

  return (
    <>
      <GuiUpdateAction ui={props.ui} about={about} />
      <props.ui.Button onClick={() => setStage('restart')}>Finish synthetic update</props.ui.Button>
    </>
  )
}

export default Plugin.define({
  main: base.main,
  setup(context) {
    base.setup(context)

    if (context.options.nativeDialogProbe) return

    const Dialog = context.ui.Dialog
    const Button = context.ui.Button

    context.add(Command, {
      id: 'quota-scales',
      title: 'Synthetic quota scales',
      run() {
        context.dialogs.open((handle) => (
          <Dialog title="Synthetic quota scales" footer={<Button onClick={handle.close}>Close</Button>}>
            <QuotaScalesFixture ui={context.ui} />
          </Dialog>
        ))
      },
    })

    context.add(Command, {
      id: 'mcp-switches',
      title: 'Synthetic MCP switches',
      run() {
        context.dialogs.open((handle) => (
          <Dialog title="Synthetic MCP switches" footer={<Button onClick={handle.close}>Close</Button>}>
            <McpFixture ui={context.ui} />
          </Dialog>
        ))
      },
    })

    context.add(Command, {
      id: 'todo-states',
      title: 'Synthetic Todo states',
      run() {
        context.dialogs.open((handle) => (
          <Dialog
            title="Synthetic Todo states"
            description="Production Navigator rows with deterministic task data."
            footer={<Button onClick={handle.close}>Close</Button>}
          >
            <ul style={{ padding: '0', margin: '0', 'list-style': 'none' }}>
              <For each={tasks}>{(item) => <TodoRow item={item} />}</For>
            </ul>
          </Dialog>
        ))
      },
    })
    context.add(Command, {
      id: 'update-stages',
      title: 'Synthetic update stages',
      run() {
        context.dialogs.open((handle) => (
          <Dialog
            title="Synthetic update stages"
            description="Presentation fixture only. No installation is started."
            footer={<Button onClick={handle.close}>Close</Button>}
          >
            <div style={{ display: 'grid', gap: '24px' }}>
              <UpdateFixture ui={context.ui} />
              <GuiProgress ui={context.ui} label="Navigator · Downloading 40%" value={0.4} />
              <GuiProgress ui={context.ui} label="Navigator · Downloading / installing" />
              <GuiProgress ui={context.ui} label="Navigator · Verifying" />
            </div>
          </Dialog>
        ))
      },
    })
  },
})
