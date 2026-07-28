import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { ALL_SITE_CONFIG_KEYS, getSiteConfigWithSource, type SiteConfigKey } from "@/lib/site-config";

// GET — trả giá trị HIỆU LỰC hiện tại (DB nếu admin đã lưu, không thì mặc
// định code) kèm nguồn cho từng key. Route CHỈ admin gọi được.
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const config = await getSiteConfigWithSource();
  return NextResponse.json({ config });
}

const INSURANCE_KEY: SiteConfigKey = "insurance_fund_target";
const TAGS_KEY: SiteConfigKey = "search_tags";
const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 30;

// PATCH — body { updates: Record<key, string|null> }. Giá trị null/rỗng =
// xoá dòng DB (quay về mặc định code). Ghi AdminAuditLog tên key đã đổi.
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
    if (!ALL_SITE_CONFIG_KEYS.includes(key as SiteConfigKey)) {
      return NextResponse.json({ error: `Key không hợp lệ: ${key}` }, { status: 400 });
    }
  }

  if (INSURANCE_KEY in updates) {
    const raw = updates[INSURANCE_KEY];
    if (raw !== null && raw !== "") {
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
        return NextResponse.json({ error: "Mức quỹ bảo hiểm gợi ý phải là số nguyên dương." }, { status: 400 });
      }
    }
  }

  if (TAGS_KEY in updates) {
    const raw = updates[TAGS_KEY];
    if (raw !== null && raw !== "") {
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(raw));
      } catch {
        return NextResponse.json({ error: "Danh sách tag không hợp lệ." }, { status: 400 });
      }
      if (
        !Array.isArray(parsed) ||
        parsed.length === 0 ||
        parsed.length > MAX_TAGS ||
        !parsed.every((t) => typeof t === "string" && t.trim().length > 0 && t.length <= MAX_TAG_LENGTH)
      ) {
        return NextResponse.json(
          { error: `Danh sách tag phải có 1-${MAX_TAGS} chuỗi, mỗi tag tối đa ${MAX_TAG_LENGTH} ký tự.` },
          { status: 400 }
        );
      }
    }
  }

  const changedKeys: string[] = [];
  await prisma.$transaction(async (tx) => {
    for (const [key, rawValue] of entries) {
      const value = typeof rawValue === "string" ? rawValue.trim() : null;
      changedKeys.push(key);
      if (!value) {
        await tx.siteConfig.deleteMany({ where: { key } });
      } else {
        await tx.siteConfig.upsert({
          where: { key },
          create: { key, value, updatedBy: session!.user!.email ?? session!.user!.id },
          update: { value, updatedBy: session!.user!.email ?? session!.user!.id },
        });
      }
    }
  });

  await logAdminAction({
    adminId: session!.user!.id,
    action: "Sửa cấu hình nội dung trang web",
    targetType: "SiteConfig",
    detail: `Đã cập nhật: ${changedKeys.join(", ")}`,
  });

  return NextResponse.json({ ok: true });
}
