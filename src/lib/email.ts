// Gửi email qua Resend — cùng quy ước env-var-gated như VNPay/Telegram
// (src/lib/payment/vnpay.ts, src/lib/telegram.ts): thiếu RESEND_API_KEY thì
// không chặn luồng quên mật khẩu, chỉ in mã OTP ra console server để vẫn
// test được đầy đủ ở dev/demo trước khi có API key thật.
import { Resend } from "resend";
import { PASSWORD_RESET_CODE_EXPIRY_MINUTES } from "@/lib/constants";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "MaketMMO <onboarding@resend.dev>";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(
      `[password-reset] RESEND_API_KEY chưa cấu hình — mã xác nhận đặt lại mật khẩu cho ${to}: ${code} (hết hạn sau ${PASSWORD_RESET_CODE_EXPIRY_MINUTES} phút)`
    );
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Mã xác nhận đặt lại mật khẩu: ${code}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
        <h2>Đặt lại mật khẩu MaketMMO</h2>
        <p>Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản này. Nhập mã xác nhận bên dưới vào trang đặt lại mật khẩu:</p>
        <p style="text-align:center; margin: 24px 0;">
          <span style="background:#8DC63F;color:#111;padding:14px 28px;border-radius:12px;font-weight:bold;font-size:32px;letter-spacing:8px;display:inline-block;">${code}</span>
        </p>
        <p style="color:#555;font-size:14px;">Mã có hiệu lực trong ${PASSWORD_RESET_CODE_EXPIRY_MINUTES} phút. Nếu bạn không yêu cầu, hãy bỏ qua email này — mật khẩu của bạn vẫn an toàn, không ai có thể đổi mật khẩu nếu không có mã này.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message || "Gửi email đặt lại mật khẩu thất bại.");
  }
}
