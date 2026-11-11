export function normalizePresetName(value: string) {
  const name = value.trim()

  if (!name) throw new Error('Enter a preset name')

  if (name.length > 64) throw new Error('Preset names can contain at most 64 characters')

  return name
}
