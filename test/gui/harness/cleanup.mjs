export function closeProcessPipes(child) {
  // A daemon can inherit the write ends after Electron exits. These read ends
  // belong to this disposable harness and must not keep its event loop alive.
  child.stdout?.destroy()
  child.stderr?.destroy()
}
