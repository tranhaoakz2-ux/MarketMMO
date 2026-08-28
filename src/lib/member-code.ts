import { prisma } from "@/lib/prisma";

const MEMBER_CODE_PREFIX = "MMO";
const MEMBER_CODE_PAD = 6;
const MEMBER_CODE_COUNTER_ID = "singleton";

export function formatMemberCode(n: number): string {
  return `${MEMBER_CODE_PREFIX}${String(n).padStart(MEMBER_CODE_PAD, "0")}`;
}

// Lấy số tiếp theo, tăng NGUYÊN TỬ — UPDATE...SET nextNumber = nextNumber+1
// tự khoá dòng ở Postgres, 2 request đăng ký cùng lúc tự tuần tự hoá (request
// sau đợi request trước commit rồi mới đọc được giá trị mới), không cần
// $transaction/khoá thủ công nào thêm. Lazy-create singleton nếu chưa có
// (cùng mẫu getPlatformFeeSetting() trong src/lib/platform-fee.ts) — race
// giữa 2 request cùng lúc lazy-create thì 1 trong 2 sẽ va unique constraint
// trên `id`, nuốt lỗi đó (dòng đã có sẵn, không cần tạo lại).
async function nextMemberNumber(): Promise<number> {
  await prisma.memberCodeCounter
    .create({ data: { id: MEMBER_CODE_COUNTER_ID, nextNumber: 1 } })
    .catch(() => null);
  const updated = await prisma.memberCodeCounter.update({
    where: { id: MEMBER_CODE_COUNTER_ID },
    data: { nextNumber: { increment: 1 } },
  });
  return updated.nextNumber - 1;
}

// Gán mã thành viên CỐ ĐỊNH cho 1 user — idempotent (đã có thì trả về luôn,
// không đổi). Dùng lúc đăng ký (POST /api/auth/register) và cho user tạo qua
// Google OAuth (events.createUser trong src/auth.ts, luồng đó không qua route
// đăng ký). Retry vài lần chỉ để phòng hờ (bộ đếm đã nguyên tử nên về lý
// thuyết không bao giờ trùng, trừ trường hợp cực hiếm dữ liệu bị can thiệp
// tay) — cùng mẫu ensureReferralCode() trong src/lib/referral.ts.
export async function ensureMemberCode(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.memberCode) return user.memberCode;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = formatMemberCode(await nextMemberNumber());
    try {
      await prisma.user.update({ where: { id: userId }, data: { memberCode: code } });
      return code;
    } catch {
      // Va unique constraint (cực hiếm) — thử số kế tiếp.
    }
  }
  throw new Error("Không thể tạo mã thành viên.");
}
