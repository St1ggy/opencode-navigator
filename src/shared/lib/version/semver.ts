function versionParts(value: string) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([^+]+))?/.exec(value)

  return match ? { numbers: match.slice(1, 4).map(Number), prerelease: match[4] || undefined } : undefined
}

export function isNewerVersion(latest: string, current: string) {
  const next = versionParts(latest)
  const installed = versionParts(current)

  if (!next || !installed) return false

  for (let index = 0; index < 3; index++) {
    if (next.numbers[index] !== installed.numbers[index]) return next.numbers[index] > installed.numbers[index]
  }

  return installed.prerelease !== undefined && next.prerelease === undefined
}
