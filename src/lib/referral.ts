import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const CODE_LENGTH = 8;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // bỏ ký tự dễ nhầm (0/O, 1/I)

export function generateReferralCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

// Sinh mã giới thiệu duy nhất và lưu vào User — dùng cả lúc đăng ký (user
// mới) lẫn lúc user cũ (tạo trước khi có tính năng affiliate, chưa có mã)
// vào trang /affiliate lần đầu. Retry khi trùng mã (xác suất rất thấp với
// 8 ký tự từ bảng 33 ký tự, nhưng vẫn xử lý cho chắc).
export async function ensureReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.referralCode) return user.referralCode;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode();
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
      });
      return code;
    } catch {
      // Va trùng unique constraint — thử mã khác.
    }
  }
  throw new Error("Không thể tạo mã giới thiệu, vui lòng thử lại.");
}
