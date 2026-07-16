// Gửi email qua Resend — cùng quy ước env-var-gated như VNPay/Telegram
// (src/lib/payment/vnpay.ts, src/lib/telegram.ts): thiếu RESEND_API_KEY thì
// không chặn luồng quên mật khẩu, chỉ in link reset ra console server để vẫn
// test được đầy đủ ở dev/demo trước khi có API key thật.
import { Resend } from "resend";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "MarketMMO <onboarding@resend.dev>";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(
      `[password-reset] RESEND_API_KEY chưa cấu hình — link đặt lại mật khẩu cho ${to}: ${resetUrl}`
    );
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Đặt lại mật khẩu MarketMMO",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
        <h2>Đặt lại mật khẩu MarketMMO</h2>
        <p>Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản này. Bấm nút bên dưới để đặt mật khẩu mới:</p>
        <p style="text-align:center; margin: 24px 0;">
          <a href="${resetUrl}" style="background:#8DC63F;color:#111;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold;display:inline-block;">Đặt lại mật khẩu</a>
        </p>
        <p style="color:#555;font-size:14px;">Link có hiệu lực trong 1 giờ. Nếu bạn không yêu cầu, hãy bỏ qua email này — mật khẩu của bạn vẫn an toàn.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message || "Gửi email đặt lại mật khẩu thất bại.");
  }
}
