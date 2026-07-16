const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Xác minh Turnstile chỉ thực sự bắt buộc khi đã cấu hình TURNSTILE_SECRET_KEY —
// nếu chưa có key (môi trường dev chưa đăng ký Cloudflare), luôn trả về hợp lệ
// để không chặn đăng nhập/đăng ký, giống quy ước AUTH_GOOGLE_ID/SECRET.
export async function verifyTurnstileToken(token: string | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
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
