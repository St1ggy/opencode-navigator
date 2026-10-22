const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

// Lazy modal code registers commands after its stable root has already appeared.
export function createFixtureDispatch(api, { wait = sleep, attempts = 160, settle = 50 } = {}) {
  let queued = Promise.resolve()

  function dispatch(command) {
    queued = queued.then(async () => {
      for (let attempt = 0; attempt < attempts; attempt++) {
        if (api.lifecycle.signal?.aborted) throw new Error(`Fixture disposed before ${command}`)

        const registered = api.keymap.getCommands({ visibility: 'registered' }).some((item) => item.name === command)

        if (registered && api.keymap.dispatchCommand(command).ok) {
          await wait(settle)

          return
        }

        await wait(50)
      }
      throw new Error(`Fixture command did not become ready: ${command}`)
    })
    // Preserve failures for the ready gate without unhandled rejections in timers.
    void queued.catch(() => {})

    return queued
  }

  return { dispatch, idle: () => queued }
}
