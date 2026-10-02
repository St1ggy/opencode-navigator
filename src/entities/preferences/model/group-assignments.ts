export function assignGroup(groups: Readonly<Record<string, string>> | undefined, key?: string, value?: string) {
  const next = { ...groups }

  if (!key) return next

  const group = value?.trim().slice(0, 64)

  if (!group) {
    delete next[key]

    return next
  }

  const canonical = Object.values(next).find((item) => item.toLocaleLowerCase() === group.toLocaleLowerCase())

  next[key] = canonical ?? group

  return next
}
