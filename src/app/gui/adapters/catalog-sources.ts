import { createNativeMcpSource } from '../../native/mcp-source'
import { createNativeSkillSource } from '../../native/skill-source'

import type { McpMutation } from '../../../entities/mcp/model'
import type { GuiSessionScope, createSelectedSessionAccess } from './selected-session'

export function createGuiCatalogSources(
  access: ReturnType<typeof createSelectedSessionAccess>,
  scope: GuiSessionScope,
) {
  function assertTarget(target: { routing: { directory?: string; workspace?: string } }) {
    if (target.routing.directory !== scope.target.directory || target.routing.workspace !== scope.target.workspace)
      throw new DOMException('Navigator catalog location changed', 'AbortError')
  }

  async function refresh<T>(target: Parameters<typeof assertTarget>[0], signal: AbortSignal, run: () => Promise<T>) {
    assertTarget(target)
    signal.throwIfAborted()
    const request = access.read(scope)
    const result = await run()

    signal.throwIfAborted()

    if (!request.current()) throw new DOMException('Navigator catalog connection changed', 'AbortError')

    return result
  }

  const data = () => access.cache(scope).data
  const skills = createNativeSkillSource({
    data,
    async use(_target, skill, signal) {
      signal.throwIfAborted()

      if (!skill.id) throw new Error('Select an exact Skill source')

      const request = access.read(scope)

      await request.client.experimental.session.skill({ sessionID: scope.target.sessionID, id: skill.id }, { signal })
      signal.throwIfAborted()

      return request.current()
    },
  })
  const mcp = createNativeMcpSource(data)
  const changeMcp: McpMutation = async (target, name, action, signal) => {
    signal.throwIfAborted()
    const request = access.read(scope)

    if (target.key !== scope.target.key) throw new DOMException('MCP location changed', 'AbortError')

    await request.client.experimental.mcp[action]({ server: name, location: request.location }, { signal })
    signal.throwIfAborted()

    if (!request.current()) throw new DOMException('MCP connection changed', 'AbortError')
  }

  return {
    skills: {
      list: (target: Parameters<typeof skills.list>[0]) => {
        assertTarget(target)

        return access.current(scope) ? skills.list(target) : []
      },
      refresh: (target: Parameters<typeof skills.refresh>[0], force: boolean, signal: AbortSignal) =>
        refresh(target, signal, () => skills.refresh(target, force, signal)),
      use: (target: Parameters<typeof skills.use>[0], skill: Parameters<typeof skills.use>[1], signal: AbortSignal) => {
        assertTarget(target)

        return skills.use(target, skill, signal)
      },
    },
    mcp: {
      list: (target: Parameters<typeof mcp.list>[0]) => {
        assertTarget(target)

        return access.current(scope) ? mcp.list(target) : []
      },
      refresh: (target: Parameters<typeof mcp.refresh>[0], force: boolean, signal: AbortSignal) =>
        refresh(target, signal, () => mcp.refresh(target, force, signal)),
    },
    changeMcp,
  }
}
