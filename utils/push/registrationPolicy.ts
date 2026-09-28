export const PUSH_REGISTRATION_REFRESH_INTERVAL_MS =
  7 * 24 * 60 * 60 * 1000;

export function isPushRegistrationStale(
  lastRegisteredAt: string | null,
  nowMs = Date.now()
): boolean {
  if (!lastRegisteredAt) return true;
  const registeredAtMs = Date.parse(lastRegisteredAt);
  return (
    !Number.isFinite(registeredAtMs) ||
    nowMs - registeredAtMs >= PUSH_REGISTRATION_REFRESH_INTERVAL_MS
  );
}
