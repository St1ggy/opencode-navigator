export const DEFAULT_LIMITS_REFRESH_MINUTES = 5
export const MAX_LIMITS_REFRESH_MINUTES = Math.floor(2_147_483_647 / 60_000)

export function parseLimitsRefreshMinutes(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 && value <= MAX_LIMITS_REFRESH_MINUTES
    ? value
    : undefined
}
