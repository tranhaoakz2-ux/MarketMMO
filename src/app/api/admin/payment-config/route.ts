import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { ALL_PAYMENT_CONFIG_KEYS, getPaymentConfigWithSource, type PaymentConfigKey } from "@/lib/payment/config";

// GET — trả giá trị HIỆU LỰC hiện tại (DB nếu admin đã lưu, không thì
// fallback .env) kèm nguồn, cho cả vnpay_hash_secret. Khác nguyên tắc
// "không bao giờ render secret ra client" áp dụng cho /admin/cai-dat (phần
// liệt kê tích hợp khác) — ở đây admin CẦN xem lại giá trị mình đã nhập để
// đối chiếu, cùng lý do lưu plaintext đã chốt (xem PaymentConfig trong
// schema.prisma). Route CHỈ admin gọi được (requireAdmin), không lộ ra
// client thường.
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const config = await getPaymentConfigWithSource();
  return NextResponse.json({ config });
}

const USDT_RATE_KEY: PaymentConfigKey = "usdt_vnd_rate";
const USDT_MARGIN_KEYS: PaymentConfigKey[] = ["usdt_deposit_margin_percent", "usdt_withdraw_margin_percent"];

// PATCH — body { updates: Record<key, string|null> }. Giá trị null/rỗng =
// xoá dòng DB (quay về fallback .env). Ghi AdminAuditLog CHỈ tên key đã đổi,
// KHÔNG BAO GIỜ ghi giá trị (đặc biệt vnpay_hash_secret) vào detail.
export async function PATCH(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const updates = body?.updates;
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const entries = Object.entries(updates) as [string, unknown][];
  for (const [key] of entries) {
    if (!ALL_PAYMENT_CONFIG_KEYS.includes(key as PaymentConfigKey)) {
      return NextResponse.json({ error: `Key không hợp lệ: ${key}` }, { status: 400 });
    }
  }

  if (USDT_RATE_KEY in updates) {
    const raw = updates[USDT_RATE_KEY];
    if (raw !== null && raw !== "") {
      const rate = Number(raw);
      if (!Number.isFinite(rate) || rate <= 0) {
        return NextResponse.json({ error: "Tỷ giá USDT/VNĐ phải là số dương." }, { status: 400 });
      }
    }
  }

  // Biên lợi nhuận sàn (spread) khi nạp/rút USDT — phải trong [0, 100). Bằng
  // hoặc vượt 100% sẽ làm tỷ giá nạp <= 0 (rate_nạp = live × (1 − biên/100)),
  // vỡ phép chia lúc tính số USDT buyer cần chuyển.
  for (const key of USDT_MARGIN_KEYS) {
    if (!(key in updates)) continue;
    const raw = updates[key];
    if (raw === null || raw === "") continue;
    const percent = Number(raw);
    if (!Number.isFinite(percent) || percent < 0 || percent >= 100) {
      return NextResponse.json(
        { error: "Biên tỷ giá USDT phải là số từ 0 đến dưới 100 (%)." },
        { status: 400 }
      );
    }
  }

  const changedKeys: string[] = [];
  await prisma.$transaction(async (tx) => {
    for (const [key, rawValue] of entries) {
      const value = typeof rawValue === "string" ? rawValue.trim() : null;
      changedKeys.push(key);
      if (!value) {
        await tx.paymentConfig.deleteMany({ where: { key } });
      } else {
        await tx.paymentConfig.upsert({
          where: { key },
          create: { key, value, updatedBy: session!.user!.email ?? session!.user!.id },
          update: { value, updatedBy: session!.user!.email ?? session!.user!.id },
        });
      }
    }
  });

  await logAdminAction({
    adminId: session!.user!.id,
    action: "Sửa cấu hình thanh toán",
    targetType: "PaymentConfig",
    detail: `Đã cập nhật: ${changedKeys.join(", ")}`,
  });

  return NextResponse.json({ ok: true });
}
