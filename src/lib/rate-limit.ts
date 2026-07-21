// Rate-limit fixed-window đơn giản, LƯU TRONG BỘ NHỚ (in-memory) của tiến trình.
// Lưu ý phạm vi: trên serverless (Vercel) mỗi instance có Map riêng nên đây là
// chống-abuse "mềm" (giới hạn theo từng instance, không toàn cục tuyệt đối).
// Đủ để chặn brute-force/spam cơ bản; nếu cần giới hạn toàn cục cứng thì phải
// dùng store ngoài (Redis/Upstash) — cố ý KHÔNG thêm hạ tầng đó ở phạm vi này.

type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();
let lastPrune = Date.now();

// Dọn các bucket đã hết hạn định kỳ để Map không phình vô hạn theo số key.
function pruneIfNeeded(now: number) {
  if (now - lastPrune < 60_000 && buckets.size < 5000) return;
  lastPrune = now;
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = { ok: boolean; retryAfterSec: number };

// Cho phép tối đa `limit` lần trong mỗi cửa sổ `windowMs` cho mỗi `key`.
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  pruneIfNeeded(now);

  const entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  if (entry.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }
  entry.count += 1;
  return { ok: true, retryAfterSec: 0 };
}
