export type CodexBindingTarget = { providerID: string; connectionID?: string }

export function codexBindingKey(target: CodexBindingTarget) {
  return JSON.stringify([target.providerID, target.connectionID ? { connectionID: target.connectionID } : null])
}

function legacyKey(key: string): [string, string] | undefined {
  try {
    const value: unknown = JSON.parse(key)

    return Array.isArray(value) && value.length === 2 && value.every((part) => typeof part === 'string' && part)
      ? (value as [string, string])
      : undefined
  } catch {
    // Preserve records from older releases without guessing their scope.
    return
  }
}

export function migrateCodexAccountBindings(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return Object.fromEntries(
    Object.entries(value).filter(([key, account]) => key && typeof account === 'string' && account.trim()),
  ) as Record<string, string>
}

export function codexBindingAccount(bindings: Record<string, string>, target: CodexBindingTarget, modelID?: string) {
  const confirmed = bindings[codexBindingKey(target)]

  if (confirmed || target.connectionID) return confirmed

  const legacy = Object.entries(bindings).filter(([key]) => legacyKey(key)?.[0] === target.providerID)
  const accounts = new Set(legacy.map(([, account]) => account))

  if (accounts.size === 1) return [...accounts][0]

  return modelID ? bindings[JSON.stringify([target.providerID, modelID])] : undefined
}

export function changeCodexBinding(
  current: Record<string, string> | undefined,
  target: CodexBindingTarget,
  accountID?: string,
) {
  const next = migrateCodexAccountBindings(current)

  if (!target.connectionID) {
    for (const key of Object.keys(next)) {
      if (legacyKey(key)?.[0] === target.providerID) delete next[key]
    }
  }

  const key = codexBindingKey(target)

  if (accountID) next[key] = accountID
  else delete next[key]

  return next
}
