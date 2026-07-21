import Link from "next/link";
import { requireAdminPage } from "@/lib/authz";
import { AdminBadge, AdminPageHeader } from "@/components/admin/AdminUi";
import AdminEscrowReleaseButton from "@/components/admin/AdminEscrowReleaseButton";
import { getAdminOrderItems } from "@/lib/queries";
import { orderStatusLabel, type OrderStatus } from "@/lib/constants";
import { formatVnd } from "@/lib/format";

export const dynamic = "force-dynamic";

const statusFilters: { key: OrderStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "ESCROW", label: "Đang ký quỹ" },
  { key: "RELEASED", label: "Hoàn thành" },
  { key: "DISPUTED", label: "Đang tranh chấp" },
  { key: "CANCELLED", label: "Đã huỷ" },
];

const badgeVariant: Record<OrderStatus, "warn" | "success" | "danger" | "neutral"> = {
  ESCROW: "warn",
  RELEASED: "success",
  DISPUTED: "danger",
  CANCELLED: "neutral",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const status = (statusFilters.some((f) => f.key === params.status) ? params.status : "ALL") as
    | OrderStatus
    | "ALL";
  const page = Math.max(1, Number(params.page) || 1);

  const { items, total, totalPages } = await getAdminOrderItems(status, page);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <AdminPageHeader
          title="Đơn hàng & Ký quỹ"
          sub={`Duyệt toàn bộ ${total} mục đơn hàng trên nền tảng — lọc theo trạng thái, giải ngân ký quỹ đến hạn.`}
        />
        <AdminEscrowReleaseButton />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {statusFilters.map((f) => (
          <Link
            key={f.key}
            href={`/admin/don-hang${f.key === "ALL" ? "" : `?status=${f.key}`}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              status === f.key
                ? "border-[var(--adm-brand)] bg-[var(--adm-brand-dim)] text-[var(--adm-brand)]"
                : "border-[var(--adm-border)] text-[var(--adm-muted)] hover:bg-white/5"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)]">
        <div className="grid grid-cols-[1fr_140px_140px_110px_100px_130px] gap-2 border-b border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-4 py-2.5 text-xs font-bold text-[var(--adm-muted)]">
          <span>Sản phẩm</span>
          <span>Người mua</span>
          <span>Người bán</span>
          <span>Số tiền</span>
          <span>Trạng thái</span>
          <span>Thời gian</span>
        </div>
        {items.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--adm-muted)]">Không có đơn hàng nào khớp bộ lọc.</div>
        ) : (
          items.map((i) => (
            <div
              key={i.id}
              className="grid grid-cols-[1fr_140px_140px_110px_100px_130px] items-center gap-2 border-b border-[var(--adm-border)] px-4 py-3 text-sm last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate font-bold text-[var(--adm-text)]">{i.productName}</p>
                {i.variantLabel && <p className="truncate text-xs text-[var(--adm-muted)]">{i.variantLabel}</p>}
              </div>
              <span className="truncate text-[var(--adm-text)]">{i.buyerName}</span>
              <span className="truncate text-[var(--adm-text)]">{i.sellerName}</span>
              <span className="font-bold text-[var(--adm-brand)]">{formatVnd(i.price * i.quantity)}</span>
              <AdminBadge variant={badgeVariant[i.status]}>{orderStatusLabel[i.status]}</AdminBadge>
              <span className="text-xs text-[var(--adm-muted)]">
                {new Date(i.createdAt).toLocaleDateString("vi-VN")}
              </span>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/don-hang?${status !== "ALL" ? `status=${status}&` : ""}page=${p}`}
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

export const metadata = { title: "Đơn hàng & Ký quỹ — Admin Control Center — MarketMMO" };
