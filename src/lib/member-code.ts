import { randomInt } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const MEMBER_CODE_PREFIX = "MM";
const MEMBER_CODE_DIGIT_COUNT = 8;
const MAX_ATTEMPTS = 8;

// "MM" + 8 chữ số ngẫu nhiên (vd "MM48273910") — KHÔNG theo thứ tự nào, xáo
// trộn hoàn toàn để không lộ "tài khoản cũ/mới" hay tổng số tài khoản qua mã.
export function generateMemberCode(): string {
  let digits = "";
  for (let i = 0; i < MEMBER_CODE_DIGIT_COUNT; i++) {
    digits += randomInt(0, 10).toString();
  }
  return `${MEMBER_CODE_PREFIX}${digits}`;
}

function isUniqueViolationOnMemberCode(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    Array.isArray((err.meta as { target?: unknown })?.target) &&
    (err.meta!.target as string[]).includes("memberCode")
  );
}

// Sinh + gán 1 mã CHƯA TỪNG DÙNG cho userId, LUÔN GHI ĐÈ (không kiểm mã cũ
// đã có hay chưa) — dùng nội bộ bởi cả ensureMemberCode() (gán lần đầu) lẫn
// reassignMemberCode() (đổi hẳn sang mã khác, vd script backfill đổi định
// dạng cũ -> mới). Chống trùng: sinh mã ngẫu nhiên -> thử UPDATE -> va UNIQUE
// constraint (P2002 trên đúng field memberCode) thì sinh mã khác thử lại —
// an toàn khi nhiều request cùng lúc trúng cùng 1 mã vì unique constraint ở
// tầng DB là chốt chặn thật (chỉ 1 request UPDATE thành công, request kia tự
// retry). Lỗi KHÁC (không phải trùng memberCode) ném thẳng ra ngoài.
async function assignRandomCode(userId: string): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateMemberCode();
    try {
      await prisma.user.update({ where: { id: userId }, data: { memberCode: code } });
      return code;
    } catch (err) {
      if (!isUniqueViolationOnMemberCode(err)) throw err;
      // Va trùng — thử mã ngẫu nhiên khác ở lượt kế tiếp.
    }
  }
  throw new Error("Không thể tạo mã thành viên.");
}

// Gán mã thành viên CỐ ĐỊNH cho 1 user — idempotent (đã có thì trả về luôn,
// không đổi). Dùng lúc đăng ký (POST /api/auth/register) và cho user tạo qua
// Google OAuth (events.createUser trong src/auth.ts, luồng đó không qua route
// đăng ký).
export async function ensureMemberCode(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.memberCode) return user.memberCode;
  return assignRandomCode(userId);
}

// Đổi mã thành viên hiện có (nếu có) sang 1 mã ngẫu nhiên MỚI — KHÁC
// ensureMemberCode() ở chỗ LUÔN gán mã mới dù đã có mã cũ. Hiện chỉ dùng bởi
// scripts/backfill-member-codes.ts (đổi toàn bộ tài khoản sang định dạng mã
// mới "MM"+8 số) — KHÔNG gọi hàm này ở bất kỳ luồng vận hành bình thường nào
// khác, vì memberCode phải CỐ ĐỊNH vĩnh viễn sau khi cấp cho user thật.
export async function reassignMemberCode(userId: string): Promise<string> {
  return assignRandomCode(userId);
}
