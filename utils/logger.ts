const DEBUG_LOGS_ENABLED =
  process.env.EXPO_PUBLIC_DEBUG_LOGS === "true" ||
  process.env.EXPO_PUBLIC_DEBUG_LOGS === "1";

export function debugLog(...args: unknown[]) {
  if (!DEBUG_LOGS_ENABLED) return;
  console.log(...args);
}

export function debugWarn(...args: unknown[]) {
  if (!DEBUG_LOGS_ENABLED) return;
  console.warn(...args);
}

export function debugError(...args: unknown[]) {
  if (!DEBUG_LOGS_ENABLED) return;
  console.error(...args);
}

export function isDebugLogsEnabled() {
  return DEBUG_LOGS_ENABLED;
}
