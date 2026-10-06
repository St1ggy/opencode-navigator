# Provider Quota Sources

Navigator follows the currently selected host model and active provider connection.
It never treats session token/cost totals as remaining provider quota. Subscription
windows, API rate limits, configured capacities, and monetary balances are different
measurements and are labelled separately.

The implemented contracts were rechecked on 2026-10-06. The runtime also includes providers from
the host catalog; an unrecognized provider gets an explicit unverified-source state
rather than fabricated quota values. Availability depends on the selected account,
permissions, region, transport, and supported host APIs.

## Audited Read Sources

| Provider | Native source | Scope and prerequisites | Reference |
| --- | --- | --- | --- |
| OpenAI / Codex ChatGPT | Codex app-server account/rate-limit RPC and manual reset credits | Verified account identity; ordinary `codex` quota is account-scoped even with null model metadata; separate model buckets need explicit association; native durations describe quota windows, not time until reset | [Codex protocol](https://github.com/openai/codex/tree/main/codex-rs/app-server-protocol) |
| OpenAI API | HTTP request/token/project-token rate-limit headers | Actual response for the selected model/account; HTTP transport | [Rate limits](https://developers.openai.com/api/docs/guides/rate-limits) |
| Anthropic API | Native response headers and organization rate-limits API | Per-model headers; configured limits need an eligible org/admin credential and explicit model association | [Rate limits API](https://platform.claude.com/docs/en/manage-claude/rate-limits-api) |
| Azure OpenAI | Native remaining request/token headers | Actual deployment response; does not expose a ChatGPT subscription | [Quotas and limits](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/quotas-limits) |
| Groq | Native request/day and token/minute response headers | Actual response for the selected model/account | [Rate limits](https://console.groq.com/docs/rate-limits) |
| Fireworks | Model response throughput headers; account quotas API | Native token/second capacities; account lookup must be unambiguous, and GPU quotas are excluded from chat-model views | [Serverless limits](https://docs.fireworks.ai/serverless/rate-limits), [Quotas API](https://docs.fireworks.ai/api-reference/list-quotas) |
| OpenRouter | Current-key USD spending budget and free-model daily requests | Normal inference key; free-model counters apply only to documented free variants | [Key API](https://openrouter.ai/docs/api/api-reference/api-keys/get-current-api-key) |
| OpenRouter management | Account purchased/used credits in USD | Management key required; never substitute key budget for account balance | [Credits API](https://openrouter.ai/docs/api/api-reference/credits/get-remaining-credits) |
| DeepSeek | Current-user currency balances | Existing inference API key; API supplies USD/CNY and separates granted/top-up balances | [Balance API](https://api-docs.deepseek.com/api/get-user-balance) |
| Moonshot / Kimi API | Available, voucher, and cash balance | Region-specific API key; international USD and China CNY are not interchangeable | [International balance](https://platform.moonshot.ai/docs/api/balance), [China balance](https://platform.moonshot.cn/docs/api/balance) |
| MiniMax Token Plan | Documented token-plan remains endpoint and provider-owned response types | Subscription key; explicit model rows/percentages only, without guessing ambiguous legacy count direction | [Token Plan FAQ](https://platform.minimax.io/docs/token-plan/faq), [Official quota SDK](https://github.com/MiniMax-AI/cli/tree/main/src/sdk/quota) |
| GitHub Copilot | Official SDK account quota RPC with explicit host token | SDK runtime; token-scoped model lookup and quota read; no private REST endpoint calls | [Official SDK](https://github.com/github/copilot-sdk), [Authentication](https://github.com/github/copilot-sdk/blob/main/docs/auth/authenticate.md) |
| NanoGPT | USD/Nano balances and daily/weekly subscription input-token quotas | Existing inference key; only models in the same API host's subscription-only catalog; null/degraded counters remain unknown | [Balance](https://docs.nano-gpt.com/api-reference/endpoint/check-balance), [Usage](https://docs.nano-gpt.com/api-reference/endpoint/subscription-usage), [Models](https://docs.nano-gpt.com/api-reference/endpoint/models) |
| SiliconFlow / China | Current-user available, charged, and granted balances | Region-specific inference key; retain unknown currency when the response omits it | [User info](https://docs.siliconflow.com/en/api-reference/userinfo/get-user-info) |
| Novita | Available balance, cash balance, credit limit, pending charges, and outstanding invoices | Existing inference key; exact 1/10000 USD scaling | [Balance](https://novita.ai/docs/api-reference/basic-get-user-balance) |
| Poe | Current combined plan/add-on point balance | Existing API credential; points are not dollars or tokens | [Usage API](https://creator.poe.com/docs/resources/usage-api) |
| AIHubMix | Current-user USD balance | Manage Key required; quota units scale by 500000 per USD | [Current user](https://docs.aihubmix.com/en/api/CliEndpoints/get-self) |

## Capability Constraints And Other Providers

| Provider / product | Constraint or additional capability required | Public reference |
| --- | --- | --- |
| Claude Pro/Max / Claude Code | Session-local `rate_limits` statusline exists; it does not provide a portable OpenCode cross-process subscription read API | [Statusline](https://code.claude.com/docs/en/statusline) |
| Google Gemini API | Project/model rate limits; AI Studio and cloud quota permissions are separate from a plain inference key | [Gemini limits](https://ai.google.dev/gemini-api/docs/rate-limits) |
| Google Vertex AI | Project/region quota and cloud authentication; shared/dynamic quotas are not a personal subscription balance | [Vertex quotas](https://cloud.google.com/vertex-ai/generative-ai/docs/quotas) |
| Amazon Bedrock | IAM/region Service Quotas and CloudWatch require additional cloud capabilities and exact model/quota mapping | [Bedrock quotas](https://docs.aws.amazon.com/bedrock/latest/userguide/quotas.html) |
| Azure AI / Microsoft Foundry | Resource/deployment quotas and cloud management permissions; no portable credit balance from an inference key alone | [Foundry quotas](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/quotas-limits) |
| Cerebras | Organization/project/model rate limits; parse only self-describing native counters actually present in the model response, never copy console tier examples | [Cerebras limits](https://inference-docs.cerebras.ai/support/rate-limits) |
| Mistral | Organization request/token limits and remaining headers; do not infer missing counter units or a subscription balance | [Known limitations](https://docs.mistral.ai/resources/known-limitations) |
| Together AI | Current serverless API exposes a retry interval on 429, not remaining counters; a portable remaining-credit API is not established by billing UI documentation | [Credits](https://docs.together.ai/docs/billing-credits), [Rate limits](https://docs.together.ai/docs/rate-limits) |
| xAI / Grok | API usage differs from consumer subscriptions; management billing needs separate team credentials | [Developer docs](https://docs.x.ai/) |
| Perplexity | API credits are separate from the consumer subscription and Computer credits; billing UI does not establish a remaining-credit read endpoint | [API billing](https://www.perplexity.ai/help-center/en/articles/10354847-api-payment-and-billing) |
| Kimi Code subscription | Keep separate from Moonshot pay-as-you-go balance; undocumented usage/browser endpoints are not adopted | [Kimi Code](https://www.kimi.com/code/docs/en/) |
| Z.ai / Zhipu GLM Coding Plan | Usage windows exist; monitor/dashboard endpoints require a documented external API contract before integration | [Coding Plan](https://docs.z.ai/devpack/overview) |
| Qwen / Alibaba Cloud / DashScope | Model/project/cloud quota and billing permissions; browser OAuth state is not a portable quota source | [Model Studio docs](https://www.alibabacloud.com/help/en/model-studio/) |
| Hugging Face Inference Providers | Hub request quotas are not automatically inference-model quotas or inference credits | [Hub limits](https://huggingface.co/docs/hub/rate-limits), [Inference pricing](https://huggingface.co/docs/inference-providers/pricing) |
| Cloudflare Workers AI | Account billing/analytics and model/resource limits; do not derive remaining free allowance from static daily examples | [Workers AI limits](https://developers.cloudflare.com/workers-ai/platform/limits/) |
| OpenCode Zen / Go | Host session statistics are not the provider's account balance; no undocumented billing endpoints are queried | [OpenCode Zen](https://opencode.ai/docs/zen/) |
| Cursor | Consumer account usage requires a supported external API; no browser cookies or local credential extraction | [Cursor docs](https://docs.cursor.com/) |
| Windsurf / Codeium | Consumer plan usage is separate from API response rate limits; no private account endpoints | [Windsurf docs](https://docs.windsurf.com/) |
| Amp | Product credits require a supported external account API; no credential-file or cookie integrations | [Amp manual](https://ampcode.com/manual) |
| OpenAI-compatible gateways | Protocol compatibility does not prove account identity, native quota units, or backend bucket/model mapping | [OpenCode providers](https://opencode.ai/docs/providers/) |
| Ollama / LM Studio / local models | Local inference generally has no provider subscription quota to read; cloud offerings are separate products | [Ollama API](https://docs.ollama.com/api), [LM Studio API](https://lmstudio.ai/docs/developer) |
| NVIDIA NIM / NGC | Cloud/trial and self-hosted limits differ; an inference endpoint does not identify an NGC credit balance | [NIM docs](https://docs.nvidia.com/nim/) |
| Cohere | Organization/API rate limits are distinct from subscription windows and account credit balances | [Cohere rate limits](https://docs.cohere.com/docs/rate-limits) |
| AI21 | Project/model rate limits; no independently verified subscription remaining-window API | [AI21 docs](https://docs.ai21.com/) |
| Replicate | Model execution billing is distinct from subscription quota; no inferred remaining credits from prediction cost | [Billing](https://replicate.com/docs/topics/billing) |
| Baseten / ModelScope / Nebius / Vultr / v0 | Additional billing permissions or an independently verified model/quota contract are required; protocol compatibility alone is insufficient | [OpenCode providers](https://opencode.ai/docs/providers/) |
| Chutes | Public current-user quota routes exist, but native units and model/allowance semantics have not been independently established | [Users API](https://chutes.ai/docs/api-reference/users) |
| Requesty | Management key/key ID and budget semantics are required; dated usage reports are not remaining quota | [Key management API](https://docs.requesty.ai/features/key-management-api) |

## Authentication And Host Boundaries

- OpenCode 2 metadata matching uses public provider/credential APIs and the built-in
  ChatGPT OAuth `metadata.accountID`. Account IDs are compared with Codex's own
  reported identity; a provider name or model-name similarity is not proof.
- A confirmation is saved once per connection, or per provider when the host has
  no connection API. Models do not need separate confirmations. Conflicting older
  model-specific records remain isolated until an explicit relink.
- Additional read-only sources use Navigator's OpenCode 2 server plugin and public
  integration/HTTP-response hooks. Secrets remain on the server and are never
  returned by quota RPCs, written to Navigator preferences, or included in logs.
- Native response observations do not issue extra model requests. No quota read
  triggers inference, a credit purchase, a reset, or an authorization flow.
- HTTP-only observations may be absent for WebSocket transports. Report that
  limitation instead of changing the host transport or reading private frames.
- The native adapters are available through the OpenCode 2 server plugin. OpenCode
  1.x keeps Codex support and capability guidance without accessing host internals.
- REST credentials are not reused against a native provider origin when the host
  explicitly configures a different gateway origin. Redirects are rejected.
- Contract fixtures cover endpoint selection, regions, units, pagination, account
  ambiguity/rotation, malformed bodies, cancellation, and partial-data handling.
  These are deterministic checks, not live billing-account probes.
- Documentation from reference implementations is used only to discover APIs;
  browser cookies, credential-file readers, private endpoints, and organization-
  specific stacks are excluded.
