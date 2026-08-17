import Link from "next/link";
import { ScrollText } from "lucide-react";
import { requireAdminPage } from "@/lib/authz";
import { type Column, DataTable, EmptyState, PageHeader } from "@/components/admin-demo/AdminDemoKit";
import { getAdminAuditLogPage } from "@/lib/queries";

export const dynamic = "force-dynamic";

// Trang THẬT "Nhật ký hoạt động" — giao diện đồng bộ với bản demo đã duyệt
// (AdminDemoAuditLog.tsx), dùng AdminDemoKit. Vẫn Server Component thuần,
// phân trang qua URL (?page=, Link điều hướng thật) — getAdminAuditLogPage()
// đã tự phân trang trong query (40/trang), không tải cả nghìn bản ghi 1 lúc.
export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const { entries, total, totalPages } = await getAdminAuditLogPage(page);
  type Entry = (typeof entries)[number];

  const columns: Column<Entry>[] = [
    {
      key: "time",
      header: "Thời gian",
      render: (e) => <span className="whitespace-nowrap text-xs text-[var(--adm-muted)]">{new Date(e.createdAt).toLocaleString("vi-VN")}</span>,
    },
    {
      key: "action",
      header: "Hành động",
      primary: true,
      render: (e) => (
        <div className="min-w-0">
          <p className="truncate font-bold text-[var(--adm-text)]">{e.action}</p>
          <p className="truncate text-xs text-[var(--adm-muted)]">bởi {e.adminName}</p>
        </div>
      ),
    },
    { key: "target", header: "Đối tượng", render: (e) => <span className="text-xs text-[var(--adm-muted)]">{e.targetType}</span> },
    { key: "detail", header: "Chi tiết", render: (e) => <span className="truncate text-xs text-[var(--adm-text)]/80">{e.detail ?? "—"}</span> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nhật ký hoạt động"
        subtitle={`${total} hành động quản trị đã ghi nhận — mọi thao tác duyệt/từ chối/khoá/giải ngân đều được lưu lại tại đây.`}
      />

      <DataTable
        columns={columns}
        rows={entries}
        rowKey={(e) => e.id}
        empty={<EmptyState icon={ScrollText} title="Chưa có hoạt động nào được ghi nhận" />}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-[var(--adm-muted)]">
            Trang <b className="tabular-nums text-[var(--adm-text)]">{page}</b> / {totalPages}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
              <Link
                key={p}
                href={`/admin/nhat-ky?page=${p}`}
                className={`grid h-8 w-8 place-items-center rounded-lg text-xs font-bold ${
                  p === page
                    ? "bg-[var(--adm-brand)] text-[#14141f]"
                    : "border border-[var(--adm-border)] bg-[var(--adm-surface-2)] text-[var(--adm-text)] hover:bg-black/5 dark:hover:bg-white/10"
                }`}
              >
                {p}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export const metadata = { title: "Nhật ký hoạt động — Admin Control Center — MarketMMO" };
