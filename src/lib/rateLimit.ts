type Bucket = { tokens: number; last: number };

const buckets = new Map<string, Bucket>();

// Simple token bucket: capacity N per windowMs, refilling linearly
export function rateLimit(key: string, capacity: number, windowMs: number): boolean {
  const now = Date.now();
  const refillRate = capacity / windowMs; // tokens per ms
  const bucket = buckets.get(key) ?? { tokens: capacity, last: now };
  const elapsed = now - bucket.last;
  bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillRate);
  bucket.last = now;

  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    return false;
  }
  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return true;
}





