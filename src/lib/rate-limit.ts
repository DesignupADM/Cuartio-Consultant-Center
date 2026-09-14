interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

interface RateLimitBucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateLimitBucket>()
const MAX_TRACKED_KEYS = 10_000

function pruneBuckets(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
  while (buckets.size >= MAX_TRACKED_KEYS) {
    const oldestKey = buckets.keys().next().value
    if (oldestKey === undefined) break
    buckets.delete(oldestKey)
  }
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  cost = 1
): RateLimitResult {
  const now = Date.now()

  if (buckets.size >= MAX_TRACKED_KEYS) pruneBuckets(now)

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    if (cost > limit) {
      buckets.set(key, { count: 0, resetAt: now + windowMs })
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1000)) }
    }
    buckets.set(key, { count: cost, resetAt: now + windowMs })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (bucket.count + cost > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    }
  }

  bucket.count += cost
  return { allowed: true, retryAfterSeconds: 0 }
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first.slice(0, 64)
  }
  const realIp = headers.get("x-real-ip")?.trim()
  return realIp ? realIp.slice(0, 64) : "unknown"
}
