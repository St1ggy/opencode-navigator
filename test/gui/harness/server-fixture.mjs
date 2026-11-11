import { Model, Plugin, Provider } from '@opencode/plugin'

export default Plugin.define({
  id: 'navigator-desktop-fixture',
  async setup(host) {
    // Desktop's managed service does not promise to inherit arbitrary renderer env.
    // The same explicit plugin option configures both fixture entries.
    if (host.options.quotaFixture !== true) return

    await host.session.hook('http.request', () => {
      throw new Error('Inference is forbidden in the synthetic quota fixture')
    })

    const providerID = Provider.ID.make('synthetic-codex')
    const modelID = Model.ID.make('synthetic-model')

    await host.provider.transform((editor) => {
      editor.add({
        info: {
          ...Provider.Info.empty(providerID),
          name: 'Synthetic Codex',
          canonical: 'openai',
          integrationID: 'openai',
          activation: 'enabled',
          package: '@ai-sdk/openai',
          settings: { baseURL: 'http://127.0.0.1:1/no-inference' },
          // Leave identity unverified so the real account-link confirmation is exercised.
        },
        models: [{ ...Model.Info.default(providerID, modelID), name: 'Synthetic model' }],
      })
    })
  },
})
