const { default: navigator } = await import(process.env.NAVIGATOR_TYPING_ENTRY)

export function observeTyping(renderer, showSidebar) {
  let keys = 0
  let replacements = 0
  let frames = 0
  let seenFrames = 0
  let ids = []
  let text = ''
  let prompt
  let input = ''
  const rows = new Map()
  const samples = []
  const onKey = (event) => {
    if (event.name?.length === 1 && !event.ctrl && !event.meta) keys++
  }
  const capture = (buffer) => {
    seenFrames++
    const collect = (node) => [node, ...node.getChildren().flatMap((child) => collect(child))]
    const nodes = collect(renderer.root)

    prompt = nodes.find((node) => node.id.startsWith('textarea-'))

    if (prompt?.plainText) {
      input = prompt.plainText
      keys = Math.max(keys, input.length)
    }

    ids = nodes.map((node) => node.id)
    text = new TextDecoder().decode(buffer.getRealCharBytes(true))
    const lines = text.split('\n')
    const y = lines.findIndex((line) => line.includes('Rename'))
    const x = y === -1 ? -1 : Bun.stringWidth(lines[y].slice(0, lines[y].indexOf('Rename')))
    const row =
      renderer.root.findDescendantById('opencode-navigator.quick-action.session.rename') ??
      nodes
        .filter((node) => node.height === 1 && node.screenY === y && node.screenX <= x && node.screenX + node.width > x)
        .sort((a, b) => b.width - a.width)[0]

    if (!row) return

    const previous = rows.get('rename')

    if (previous && previous !== row && keys > 0) replacements++

    rows.set('rename', row)

    if (keys > 0) {
      frames++
      samples.push({ keys, frame: frames, replaced: previous && previous !== row, text })
    }
  }
  const write = () =>
    void Bun.write(
      process.env.NAVIGATOR_TYPING_REPORT,
      JSON.stringify(
        {
          keys,
          frames,
          seenFrames,
          ids,
          focused: renderer.currentFocusedRenderable?.id,
          input,
          lines: text.split('\n'),
          replacements,
          samples,
        },
        null,
        2,
      ),
    )

  renderer.keyInput.on('keypress', onKey)
  renderer.addPostProcessFn(capture)
  const timer = setInterval(write, 100)
  const show = setInterval(() => {
    if (keys > 0) return

    if (text.includes('QUICK ACTIONS')) {
      prompt?.focus()
    } else {
      showSidebar()
    }
  }, 500)

  return () => {
    clearInterval(timer)
    clearInterval(show)
    renderer.keyInput.off('keypress', onKey)
    renderer.removePostProcessFn(capture)
    write()
  }
}

export default {
  id: 'opencode-navigator',
  async tui(api, options, meta) {
    await navigator.tui(api, options, meta)
    api.lifecycle.onDispose(observeTyping(api.renderer, () => api.keymap.dispatchCommand('session.sidebar.toggle')))
  },
  async setup(context) {
    const dispose = await navigator.setup(context)
    const stop = observeTyping(context.renderer, () => {
      const command = context.keymap.commands().find((item) => /sidebar/i.test(item.id ?? ''))

      if (command?.id) context.keymap.dispatch(command.id)
    })

    return async () => {
      stop()
      await dispose?.()
    }
  },
}
