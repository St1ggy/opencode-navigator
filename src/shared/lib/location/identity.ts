export type LocationIdentity = {
  serverID: string
  directory: string
  workspace?: string
}

export type LocationTarget = LocationIdentity & { key: string }
export type SessionTarget = LocationTarget & { sessionID: string; sessionKey: string }

function safeServerID(value: string) {
  if (!/^https?:\/\//u.test(value)) return true

  try {
    const url = new URL(value)

    return !url.username && !url.password && !url.search && !url.hash
  } catch {
    return false
  }
}

// Identity contains only explicit routing fields, never a host client or credentials.
export function locationTarget(input: LocationIdentity): LocationTarget | undefined {
  const { serverID, directory, workspace } = input

  if (!serverID.trim() || !directory.trim() || !safeServerID(serverID)) return

  return {
    serverID,
    directory,
    ...(workspace && { workspace }),
    key: JSON.stringify([serverID, directory, workspace ?? null]),
  }
}

export function sessionTarget(input: LocationIdentity & { sessionID: string }): SessionTarget | undefined {
  const location = locationTarget(input)

  if (!location || !input.sessionID.trim()) return

  return {
    ...location,
    sessionID: input.sessionID,
    sessionKey: JSON.stringify([location.key, input.sessionID]),
  }
}
