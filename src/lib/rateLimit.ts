type Bucket = { tokens: number; last: number; expires: number };

let nextSweep = 0;
const maximumBuckets = 50000;
const buckets = new Map<string, Bucket>();

// Simple token bucket: capacity N per windowMs, refilling linearly
export function rateLimit(key: string, capacity: number, windowMs: number): boolean {
  const now = Date.now();
  if (now >= nextSweep) {
    buckets.forEach((entry, id) => {
      if (entry.expires <= now) buckets.delete(id);
    });
    nextSweep = now + 60_000;
  }
  if (!buckets.has(key) && buckets.size >= maximumBuckets) return false;
  const refillRate = capacity / windowMs; // tokens per ms
  const bucket = buckets.get(key) ?? { tokens: capacity, last: now, expires: now + windowMs };
  const elapsed = now - bucket.last;
  bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillRate);
  bucket.last = now;
  bucket.expires = now + windowMs;

  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    return false;
  }
  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return true;
}





