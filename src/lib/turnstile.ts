const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// FAIL-CLOSED: thiếu key hoặc verify lỗi -> TỪ CHỐI (không cho qua). Chỉ môi
// trường KHÔNG phải production (dev/test chưa đăng ký Cloudflare) mới được bỏ
// qua khi thiếu key — production BẮT BUỘC có TURNSTILE_SECRET_KEY, nếu không mọi
// đăng nhập/đăng ký sẽ bị chặn (đúng chủ ý: buộc cấu hình chống bot ở prod).
export async function verifyTurnstileToken(token: string | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Prod thiếu key -> false (fail-closed). Dev/test -> true (không chặn dev).
    return process.env.NODE_ENV !== "production";
  }
  if (!token) return false;

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
