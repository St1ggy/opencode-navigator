export const hostUsage = {
  workspace: {
    id: 'workspace-synthetic',
    name: 'Synthetic workspace',
    usageURL: 'https://example.com/synthetic/usage',
  },
  go: {
    rolling: { percent: 20, limited: false, resetsAt: 1000 },
    weekly: { percent: 100, limited: true, resetsAt: 2000 },
    monthly: { percent: 0, limited: false, resetsAt: 3000 },
  },
  budgets: [
    {
      id: 'workspace',
      limit: 100,
      spent: 30,
      scope: 'combined',
      per: 'set',
      coverage: 'all',
      shared: true,
      models: [],
      vendors: [],
      picked: false,
      resetsAt: 4000,
    },
    {
      id: 'model',
      limit: 20,
      spent: 19,
      scope: 'each',
      per: 'model',
      coverage: 'models',
      shared: false,
      vendors: [],
      picked: true,
      models: [
        { providerID: 'console', modelID: 'model', name: 'Model', spent: 5 },
        { providerID: 'other', modelID: 'model', name: 'Other model', spent: 19 },
      ],
      resetsAt: 5000,
    },
  ],
} as const
