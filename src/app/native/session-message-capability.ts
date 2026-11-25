export function sessionMessagesUnavailable(
  data?: { session?: { get?: unknown; sync?: unknown; message?: { list?: unknown; sync?: unknown } } },
  feature = 'native Todo',
) {
  const session = data?.session

  if (
    typeof session?.get === 'function' &&
    typeof session.sync === 'function' &&
    typeof session.message?.list === 'function' &&
    typeof session.message.sync === 'function'
  )
    return

  return `This OpenCode host does not expose the session messages needed to show ${feature}.`
}
