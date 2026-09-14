const seen = new Map<string, number>()
const MAX_TRACKED_FINGERPRINTS = 10_000

export const REPLAY_WINDOW_MS = 15 * 60 * 1000

export function hasSeenRecently(fingerprint: string, windowMs: number): boolean {
  const seenAt = seen.get(fingerprint)
  if (seenAt === undefined) return false
  if (Date.now() - seenAt >= windowMs) {
    seen.delete(fingerprint)
    return false
  }
  return true
}

export function rememberRequest(fingerprint: string, windowMs: number): void {
  const now = Date.now()

  if (seen.size >= MAX_TRACKED_FINGERPRINTS) {
    for (const [key, timestamp] of seen) {
      if (now - timestamp >= windowMs) seen.delete(key)
    }
    while (seen.size >= MAX_TRACKED_FINGERPRINTS) {
      const oldestKey = seen.keys().next().value
      if (oldestKey === undefined) break
      seen.delete(oldestKey)
    }
  }

  seen.set(fingerprint, now)
}
