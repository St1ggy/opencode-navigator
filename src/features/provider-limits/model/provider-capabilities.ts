export type ProviderQuotaCapability = {
  id: string
  name: string
  sources: string[]
  reason: string
  documentation: string[]
}

const rows: [string, string, string[], string, string][] = [
  [
    'openai',
    'OpenAI / Codex',
    ['subscription', 'api-rate-limits'],
    'Codex account RPC; HTTP response request/token limits for API connections.',
    'https://developers.openai.com/api/docs/guides/rate-limits',
  ],
  [
    'anthropic',
    'Anthropic / Claude',
    ['api-rate-limits', 'configured-limits'],
    'Model HTTP headers; eligible organization/admin credentials can read configured model limits. Claude subscription windows are separate.',
    'https://platform.claude.com/docs/en/manage-claude/rate-limits-api',
  ],
  [
    'openrouter',
    'OpenRouter',
    ['key-budget', 'account-balance'],
    'Inference-key budget; account credits require a management key. Free-model request limits apply only to free variants.',
    'https://openrouter.ai/docs/api/api-reference/api-keys/get-current-api-key',
  ],
  [
    'deepseek',
    'DeepSeek',
    ['account-balance'],
    'Provider-reported USD/CNY available, granted and topped-up balances.',
    'https://api-docs.deepseek.com/api/get-user-balance',
  ],
  [
    'moonshotai',
    'Moonshot / Kimi API',
    ['account-balance'],
    'International USD balances; coding subscriptions are a different product.',
    'https://platform.moonshot.ai/docs/api/balance',
  ],
  [
    'moonshotai-cn',
    'Moonshot / Kimi API China',
    ['account-balance'],
    'China CNY balances; never reuse an international key against the China endpoint.',
    'https://platform.moonshot.cn/docs/api/balance',
  ],
  [
    'minimax',
    'MiniMax',
    ['subscription', 'account-balance'],
    'Token Plan model rows/explicit percentages; official SDK balance response for pay-as-you-go keys.',
    'https://platform.minimax.io/docs/token-plan/faq',
  ],
  [
    'minimax-cn',
    'MiniMax China',
    ['subscription', 'account-balance'],
    'Region-specific native Token Plan and SDK balance endpoints.',
    'https://github.com/MiniMax-AI/cli/tree/main/src/sdk/quota',
  ],
  [
    'github-copilot',
    'GitHub Copilot',
    ['subscription'],
    'Official SDK token-scoped quota/model RPC; no direct copilot_internal calls or ambient CLI login.',
    'https://github.com/github/copilot-sdk/blob/main/docs/features/usage-and-billing.md',
  ],
  [
    'groq',
    'Groq',
    ['api-rate-limits'],
    'Native model response headers: requests per day and tokens per minute.',
    'https://console.groq.com/docs/rate-limits',
  ],
  [
    'fireworks-ai',
    'Fireworks',
    ['configured-limits', 'api-rate-limits'],
    'Native model token/second capacities and account monthly spend quota; GPU quotas are excluded.',
    'https://docs.fireworks.ai/serverless/rate-limits',
  ],
  [
    'siliconflow',
    'SiliconFlow',
    ['account-balance'],
    'Native current-user balances; retain unknown currency when the API does not report it.',
    'https://docs.siliconflow.com/en/api-reference/userinfo/get-user-info',
  ],
  [
    'siliconflow-cn',
    'SiliconFlow China',
    ['account-balance'],
    'Region-specific current-user balances; currency is unknown when the API omits it.',
    'https://docs.siliconflow.cn/',
  ],
  [
    'novita-ai',
    'Novita',
    ['account-balance'],
    'Native current-user balances in 1/10000 USD.',
    'https://novita.ai/docs/api-reference/basic-get-user-balance',
  ],
  [
    'poe',
    'Poe',
    ['account-balance'],
    'API account point balance; includes plan and add-on points, not session token usage.',
    'https://creator.poe.com/docs/resources/usage-api',
  ],
  [
    'nano-gpt',
    'NanoGPT',
    ['account-balance', 'subscription'],
    'Native USD/Nano balance and documented subscription token windows; null/degraded counters remain unknown.',
    'https://docs.nano-gpt.com/api-reference/endpoint/subscription-usage',
  ],
  [
    'aihubmix',
    'AIHubMix',
    ['account-balance'],
    'Current-account balance API needs a Manage Key; inference keys do not grant management access.',
    'https://docs.aihubmix.com/en/api/CliEndpoints/get-self',
  ],
  [
    'azure',
    'Azure OpenAI',
    ['api-rate-limits'],
    'Remaining request/token headers for the actual deployment; no ChatGPT subscription or inferred cloud balance.',
    'https://learn.microsoft.com/en-us/azure/ai-foundry/openai/quotas-limits',
  ],
  [
    'cerebras',
    'Cerebras',
    ['api-rate-limits'],
    'Only self-describing native counters actually returned for the selected model; console tier examples are not live quota.',
    'https://inference-docs.cerebras.ai/support/rate-limits',
  ],
  [
    'mistral',
    'Mistral',
    [],
    'Documented remaining header lacks a verified unit/window association; no inferred subscription balance.',
    'https://docs.mistral.ai/resources/known-limitations',
  ],
  [
    'togetherai',
    'Together AI',
    [],
    'Dynamic model limits expose retry intervals, not remaining quota; billing UI does not establish a remaining-credit API.',
    'https://docs.together.ai/docs/rate-limits',
  ],
  [
    'xai',
    'xAI / Grok',
    [],
    'Management billing needs separate team credentials; no verified portable remaining API for this inference connection.',
    'https://docs.x.ai/',
  ],
  [
    'perplexity',
    'Perplexity',
    [],
    'No verified remaining-credit API for an inference key. API credits, consumer subscriptions and Computer credits are distinct.',
    'https://www.perplexity.ai/help-center/en/articles/10354847-api-payment-and-billing',
  ],
  [
    'google',
    'Google Gemini',
    ['configured-limits'],
    'Native model-matched QuotaFailure responses when provided; cloud quota permissions differ from an inference key.',
    'https://ai.google.dev/gemini-api/docs/rate-limits',
  ],
  [
    'google-vertex',
    'Google Vertex AI',
    ['configured-limits'],
    'Native model-matched quota error details; cloud project/region management and dynamic shared quotas are separate.',
    'https://cloud.google.com/vertex-ai/generative-ai/docs/quotas',
  ],
  [
    'amazon-bedrock',
    'Amazon Bedrock',
    [],
    'Service Quotas/CloudWatch require cloud IAM/region/model mapping not exposed by a portable inference connection.',
    'https://docs.aws.amazon.com/bedrock/latest/userguide/quotas.html',
  ],
  [
    'cloudflare-workers-ai',
    'Cloudflare Workers AI',
    [],
    'Account analytics do not prove remaining free allowance; separate account management capability is required.',
    'https://developers.cloudflare.com/workers-ai/platform/limits/',
  ],
  [
    'huggingface',
    'Hugging Face Inference Providers',
    [],
    'Hub request quota is not an inference-model quota or inference-credit balance.',
    'https://huggingface.co/docs/inference-providers/pricing',
  ],
  [
    'zai',
    'Z.ai / GLM Coding Plan',
    [],
    'No verified external quota contract for monitor/dashboard APIs; private endpoints are excluded.',
    'https://docs.z.ai/devpack/overview',
  ],
  [
    'kimi-for-coding',
    'Kimi Code subscription',
    [],
    'Keep separate from Moonshot API balance; an external subscription usage contract/model mapping must be verified.',
    'https://www.kimi.com/code/docs/en/',
  ],
  [
    'alibaba',
    'Alibaba Cloud / Qwen / DashScope',
    [],
    'Cloud account/project billing permissions and model mapping are required; browser OAuth state is not a quota source.',
    'https://www.alibabacloud.com/help/en/model-studio/',
  ],
  [
    'opencode',
    'OpenCode Zen / Go',
    [],
    'Session token/cost statistics are not provider quota; no undocumented billing endpoints.',
    'https://opencode.ai/docs/zen/',
  ],
  [
    'cursor',
    'Cursor',
    [],
    'Consumer usage needs a supported external API; no cookie or credential-file integrations.',
    'https://docs.cursor.com/',
  ],
  [
    'windsurf',
    'Windsurf / Codeium',
    [],
    'Consumer plan windows need a supported external API; no private account endpoints.',
    'https://docs.windsurf.com/',
  ],
  [
    'amp',
    'Amp',
    [],
    'Product credits need a supported external account API; no cookie or local credential extraction.',
    'https://ampcode.com/manual',
  ],
  [
    'ollama',
    'Ollama',
    [],
    'Local inference has no provider subscription window; cloud products require their own account API.',
    'https://docs.ollama.com/api',
  ],
  [
    'lmstudio',
    'LM Studio',
    [],
    'Local inference has no provider subscription quota to read.',
    'https://lmstudio.ai/docs/developer',
  ],
  [
    'nvidia',
    'NVIDIA NIM / NGC',
    [],
    'Inference access does not identify cloud/trial NGC credit balance or self-hosted resource quota.',
    'https://docs.nvidia.com/nim/',
  ],
  [
    'cohere',
    'Cohere',
    [],
    'No verified native remaining-counter contract for this integration; static organization tier examples are not live quotas.',
    'https://docs.cohere.com/docs/rate-limits',
  ],
  [
    'ai21',
    'AI21',
    [],
    'No verified native remaining-counter contract or subscription balance endpoint for this integration.',
    'https://docs.ai21.com/',
  ],
  [
    'replicate',
    'Replicate',
    [],
    'Prediction cost is not remaining account credit; no inferred balance from execution cost.',
    'https://replicate.com/docs/topics/billing',
  ],
  [
    'chutes',
    'Chutes',
    [],
    'Current-user quota APIs exist, but their public schemas do not establish native units/model allowance semantics yet.',
    'https://chutes.ai/docs/api-reference/users',
  ],
  [
    'requesty',
    'Requesty',
    [],
    'Enterprise management key and key ID are required; dated usage reports alone are not remaining budget.',
    'https://docs.requesty.ai/features/key-management-api',
  ],
  [
    'baseten',
    'Baseten',
    [],
    'No independently verified portable remaining quota API for the configured inference connection.',
    'https://docs.baseten.co/',
  ],
  [
    'modelscope',
    'ModelScope',
    [],
    'No independently verified portable remaining quota API/model mapping for the selected connection.',
    'https://opencode.ai/docs/providers/',
  ],
  [
    'nebius',
    'Nebius',
    [],
    'Cloud billing/management access is separate from a plain inference credential.',
    'https://docs.nebius.com/',
  ],
  [
    'vultr',
    'Vultr',
    [],
    'Cloud management quota/billing permissions are separate from inference access.',
    'https://docs.vultr.com/',
  ],
  [
    'v0',
    'Vercel v0',
    [],
    'Consumer/product credits need their own documented external account API.',
    'https://v0.dev/docs',
  ],
]

export const PROVIDER_QUOTA_CAPABILITIES: readonly ProviderQuotaCapability[] = /* @__PURE__ */ rows.map(
  ([id, name, sources, reason, url]) => ({ id, name, sources, reason, documentation: [url] }),
)

const aliases: Record<string, string> = {
  fireworks: 'fireworks-ai',
  novita: 'novita-ai',
  moonshot: 'moonshotai',
  'minimax-coding-plan': 'minimax',
  'minimax-coding-plan-cn': 'minimax-cn',
  together: 'togetherai',
  'silicon-flow': 'siliconflow',
  'github-copilot-enterprise': 'github-copilot',
  'google-vertex-anthropic': 'google-vertex',
  'z-ai': 'zai',
  zhipuai: 'zai',
  dashscope: 'alibaba',
  'alibaba-cn': 'alibaba',
  qwen: 'alibaba',
  'opencode-go': 'opencode',
  'opencode-zen': 'opencode',
  codeium: 'windsurf',
  'azure-cognitive-services': 'azure',
}

export function providerQuotaCapability(id: string, canonical?: string): ProviderQuotaCapability {
  const key = aliases[canonical ?? id] ?? canonical ?? id
  const found = PROVIDER_QUOTA_CAPABILITIES.find((entry) => entry.id === key)

  return (
    found ?? {
      id,
      name: id,
      sources: [],
      reason: 'No independent quota/balance API or native counter semantics are verified for this provider.',
      documentation: ['https://opencode.ai/docs/providers/'],
    }
  )
}

export function providerQuotaCatalog(providers: readonly { id: string; name: string; canonical?: string }[] = []) {
  const entries = new Map(PROVIDER_QUOTA_CAPABILITIES.map((entry) => [entry.id, entry]))

  for (const provider of providers)
    entries.set(provider.id, {
      ...providerQuotaCapability(provider.id, provider.canonical),
      id: provider.id,
      name: provider.name,
    })

  return [...entries.values()].sort((a, b) => a.name.localeCompare(b.name))
}
