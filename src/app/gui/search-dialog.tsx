import { GuiSearchDialog } from '../../features/search-everything/gui'

import { createSelectedSessionAccess } from './adapters/selected-session'

import type { PreferencesController } from '../../entities/preferences/model'
import type { SearchResult } from '../../features/search-everything/model'
import type { MonitoringRegistry } from './monitoring-registry'
import type { createGuiSkillDialogs } from './skill-dialogs'
import type { Context } from '@opencode/plugin/gui'

export function createGuiSearchDialog(
  context: Context,
  registry: MonitoringRegistry,
  preferences: PreferencesController,
  skills: ReturnType<typeof createGuiSkillDialogs>,
) {
  const access = createSelectedSessionAccess(() => context.sessions.current())
  const Dialog = context.ui.Dialog
  const Button = context.ui.Button
  const [presentation, change] = context.storage.memory<{ scroll: Record<string, number> }>(`${context.id}.search`, {
    initial: { scroll: {} },
  })

  function favorite(result: SearchResult) {
    if (!preferences.ready()) return

    switch (result.group) {
      case 'Skills': {
        return preferences.isFavoriteSkill(result.skill)
      }

      case 'MCP': {
        return preferences.favoriteMcpServers().has(result.server)
      }

      case 'Actions': {
        return preferences.favoriteQuickActions().has(result.command)
      }

      case 'Subagents': {
        return
      }
    }
  }
  function toggleFavorite(result: SearchResult) {
    if (!preferences.ready()) return

    switch (result.group) {
      case 'Skills': {
        preferences.toggleFavoriteSkill(result.skill)
        break
      }

      case 'MCP': {
        preferences.toggleFavoriteMcpServer(result.server)
        break
      }

      case 'Actions': {
        preferences.toggleFavoriteQuickAction(result.command)
        break
      }

      case 'Subagents': {
        break
      }
    }
  }

  return {
    open() {
      const runtime = registry.active()
      const scope = access.capture()
      const model = runtime?.search
      const catalogs = runtime?.catalogs

      if (!runtime || !scope || !model || !catalogs) return

      context.dialogs.open((dialog) => {
        async function run(result: SearchResult) {
          if (!access.current(scope!)) throw new DOMException('Search target changed', 'AbortError')

          switch (result.group) {
            case 'Skills': {
              skills.open(result.skill, dialog.close)

              return false
            }

            case 'MCP': {
              if (catalogs!.mcp.list().every((item) => item.name !== result.server))
                throw new Error('MCP server changed; choose its current result.')

              await catalogs!.mcp.toggle(result.server)

              return false
            }

            case 'Subagents': {
              if (
                runtime!.subagents.list(scope!.target.sessionID).every((item) => item.session.id !== result.sessionID)
              )
                throw new Error('Subagent is no longer available.')

              runtime!.subagents.open(result.sessionID)

              return true
            }

            case 'Actions': {
              await catalogs!.runAction(result.command)

              return true
            }
          }
        }

        return (
          <GuiSearchDialog
            ui={context.ui}
            model={model}
            current={() => access.current(scope)}
            close={dialog.close}
            run={run}
            favorite={favorite}
            toggleFavorite={(result) => {
              if (access.current(scope)) toggleFavorite(result)
            }}
            information={(result) => {
              const value = result.information

              if (!value) return

              context.dialogs.open((details) => (
                <Dialog title={value.title} size="large" footer={<Button onClick={details.close}>Close</Button>}>
                  <pre style={{ 'white-space': 'pre-wrap', 'overflow-wrap': 'anywhere' }}>{value.body}</pre>
                </Dialog>
              ))
            }}
            errors={[
              catalogs.skills.error(),
              catalogs.mcp.state().error?.message,
              runtime.subagents.state(scope.target.sessionID).error?.message,
            ].filter((value): value is string => typeof value === 'string')}
            retry={() => {
              if (access.current(scope)) void runtime.refresh(true)
            }}
            scrollTop={() => presentation.scroll[`${scope.target.sessionKey}:${model.group()}`] ?? 0}
            onScroll={(top) => {
              if (access.current(scope))
                change((value) => {
                  value.scroll[`${scope.target.sessionKey}:${model.group()}`] = top
                })
            }}
          />
        )
      })
    },
  }
}
