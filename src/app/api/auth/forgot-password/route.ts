import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { PASSWORD_RESET_CODE_EXPIRY_MINUTES } from "@/lib/constants";
import { sendPasswordResetEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const GENERIC_MESSAGE =
  "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi mã xác nhận đặt lại mật khẩu. Vui lòng kiểm tra hộp thư (kể cả mục spam).";

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Email không hợp lệ." }, { status: 400 });
  }

  // Rate-limit theo CẢ email lẫn IP (2 key riêng) — chặn 1 IP spam nhiều
  // email khác nhau, và chặn nhiều IP cùng spam 1 email. Kết quả rate-limit
  // không phụ thuộc email có tồn tại hay không (bucket key là email/IP thô,
  // không tra DB trước) nên không mở thêm kênh dò tài khoản — an toàn để trả
  // message riêng biệt cho nhánh bị chặn.
  const ip = clientIp(req);
  const ipOk = rateLimit(`forgot-pw-ip:${ip}`, 10, 60 * 60 * 1000).ok;
  const emailOk = rateLimit(`forgot-pw-email:${email}`, 5, 60 * 60 * 1000).ok;
  if (!ipOk || !emailOk) {
    return NextResponse.json(
      { error: "Bạn gửi yêu cầu quá nhanh, vui lòng thử lại sau ít phút." },
      { status: 429 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Không tiết lộ email có tồn tại hay không (tránh dò tài khoản) — luôn trả
  // cùng 1 message dù không tìm thấy user, hoặc user chỉ đăng nhập qua Google
  // (không có passwordHash nên không có gì để "đặt lại").
  if (user && user.passwordHash) {
    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_CODE_EXPIRY_MINUTES * 60 * 1000);

    await prisma.$transaction([
      // Vô hiệu các mã cũ chưa dùng của user này — chỉ 1 mã có hiệu lực tại
      // 1 thời điểm.
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
      prisma.passwordResetToken.create({ data: { userId: user.id, codeHash, expiresAt } }),
    ]);

    try {
      await sendPasswordResetEmail(email, code);
    } catch {
      // Không tiết lộ lỗi gửi email ra response — tránh dùng lỗi gửi mail để
      // dò xem email có tồn tại trong hệ thống hay không.
    }
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
