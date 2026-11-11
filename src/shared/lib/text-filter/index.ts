export function matchesFilter(query: string, ...values: (string | undefined)[]) {
  const needle = query.trim().toLocaleLowerCase()

  return !needle || values.some((value) => value?.toLocaleLowerCase().includes(needle))
}
