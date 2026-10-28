// Synthetic OpenCode 2.2 public usage DTOs, rendered by the real Limits components.
export function createHostUsageFixture(scene, now, directory) {
  const model = { providerID: scene === 'host-usage-go' ? 'opencode-go' : 'synthetic-console', modelID: 'synthetic-model', sessionID: 'synthetic-session', providerName: scene === 'host-usage-go' ? 'OpenCode Go' : 'OpenCode Console', modelName: 'Synthetic model' }
  const location = { directory }
  const usage = {
    workspace: { id: 'synthetic-workspace', name: 'Synthetic workspace', usageURL: 'https://example.com/synthetic/usage' },
    budgets: [{
      id: 'synthetic-shared-budget', limit: 100, spent: 35, scope: 'combined', per: 'set', coverage: 'all',
      shared: true, models: [], vendors: [], picked: false, resetsAt: now + 86_400_000,
    }, {
      id: 'synthetic-model-budget', limit: 20, spent: 19, scope: 'each', per: 'model', coverage: 'models',
      shared: false, vendors: [], picked: true,
      models: [{ providerID: model.providerID, modelID: model.modelID, name: model.modelName, spent: 5 }],
      resetsAt: now + 3_600_000,
    }],
    ...(scene === 'host-usage-go' && { go: {
      rolling: { percent: 25, limited: false, resetsAt: now + 3_600_000 },
      weekly: { percent: 80, limited: false, resetsAt: now + 172_800_000 },
      monthly: { percent: 100, limited: true, resetsAt: now + 604_800_000 },
    } }),
  }
  const context = {
    location,
    data: {
      on: () => () => {},
      location: {
        default: () => location,
        provider: { list: () => [{ id: model.providerID, name: model.providerName, integrationID: 'opencode' }] },
        integration: { list: () => [] },
        model: { list: () => [{ providerID: model.providerID, id: model.modelID, cost: [{ input: 1 }] }] },
      },
    },
    client: { usage: { async limits() {
      if (scene === 'host-usage-failure') throw new Error('Synthetic native usage network failure')

      return { location, data: scene === 'host-usage-auth' ? null : usage }
    } } },
  }

  return { context, model }
}
