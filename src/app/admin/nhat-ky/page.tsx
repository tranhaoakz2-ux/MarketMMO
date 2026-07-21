import Link from "next/link";
import { requireAdminPage } from "@/lib/authz";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import { getAdminAuditLogPage } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const { entries, total, totalPages } = await getAdminAuditLogPage(page);

  return (
    <div>
      <AdminPageHeader
        title="Nhật ký hoạt động"
        sub={`${total} hành động quản trị đã ghi nhận — mọi thao tác duyệt/từ chối/khoá/giải ngân đều được lưu lại tại đây.`}
      />

      <div className="overflow-hidden rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)]">
        <div className="grid grid-cols-[140px_1fr_120px_1fr] gap-2 border-b border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-4 py-2.5 text-xs font-bold text-[var(--adm-muted)]">
          <span>Thời gian</span>
          <span>Hành động</span>
          <span>Đối tượng</span>
          <span>Chi tiết</span>
        </div>
        {entries.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--adm-muted)]">Chưa có hoạt động nào được ghi nhận.</div>
        ) : (
          entries.map((e) => (
            <div
              key={e.id}
              className="grid grid-cols-[140px_1fr_120px_1fr] items-center gap-2 border-b border-[var(--adm-border)] px-4 py-3 text-sm last:border-0"
            >
              <span className="text-xs text-[var(--adm-muted)]">
                {new Date(e.createdAt).toLocaleString("vi-VN")}
              </span>
              <div className="min-w-0">
                <p className="truncate font-bold text-[var(--adm-text)]">{e.action}</p>
                <p className="truncate text-xs text-[var(--adm-muted)]">bởi {e.adminName}</p>
              </div>
              <span className="truncate text-xs text-[var(--adm-muted)]">{e.targetType}</span>
              <span className="truncate text-xs text-[var(--adm-text)]/80">{e.detail ?? "—"}</span>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/nhat-ky?page=${p}`}
              className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                p === page
                  ? "bg-[var(--adm-brand)] text-[#14141f]"
                  : "border border-[var(--adm-border)] text-[var(--adm-muted)] hover:bg-white/5"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export const metadata = { title: "Nhật ký hoạt động — Admin Control Center — MarketMMO" };
