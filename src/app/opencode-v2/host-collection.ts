export function collectionLocation(target: { routing: { directory?: string; workspace?: string } }) {
  return {
    directory: target.routing.directory ?? '',
    ...(target.routing.workspace && { workspaceID: target.routing.workspace }),
  }
}

export async function syncCollection(
  collection: {
    sync(ref: ReturnType<typeof collectionLocation>): Promise<void>
    invalidate(ref: ReturnType<typeof collectionLocation>): void
  },
  target: Parameters<typeof collectionLocation>[0],
  force: boolean,
  signal: AbortSignal,
) {
  signal.throwIfAborted()
  const ref = collectionLocation(target)

  if (force) collection.invalidate(ref)

  await collection.sync(ref)
  signal.throwIfAborted()
}
