import { createSignal } from 'solid-js'

export function createMonitoringViewState() {
  const [todoMode, setTodoMode] = createSignal<'all' | 'active' | 'finished'>('all')
  const [todoQuery, setTodoQuery] = createSignal('')
  const [subagentMode, setSubagentMode] = createSignal<'active' | 'recent' | 'errors'>('active')
  const [subagentQuery, setSubagentQuery] = createSignal('')

  return {
    todoMode,
    setTodoMode,
    todoQuery,
    setTodoQuery,
    subagentMode,
    setSubagentMode,
    subagentQuery,
    setSubagentQuery,
  }
}
