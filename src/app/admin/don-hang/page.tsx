import Link from "next/link";
import { requireAdminPage } from "@/lib/authz";
import { type Column, DataTable, EmptyState, PageHeader, StatusBadge, type Tone, formatVndDemo } from "@/components/admin-demo/AdminDemoKit";
import AdminEscrowReleaseButton from "@/components/admin/AdminEscrowReleaseButton";
import AdminPreOrderRefundButton from "@/components/admin/AdminPreOrderRefundButton";
import OrderStatusTimeline from "@/components/OrderStatusTimeline";
import { getAdminOrderItems } from "@/lib/queries";
import { orderStatusLabel, type OrderStatus } from "@/lib/constants";
import { Inbox } from "lucide-react";

export const dynamic = "force-dynamic";

// Trang THẬT "Đơn hàng & Ký quỹ" — giao diện đồng bộ với bản demo đã duyệt
// (AdminDemoOrders.tsx), dùng AdminDemoKit. Vẫn là Server Component thuần
// (không "use client") — lọc trạng thái + phân trang giữ nguyên qua URL
// (?status=&page=, Link điều hướng thật, KHÔNG chuyển sang state client như
// demo) để tiếp tục fetch đúng trang/bộ lọc từ DB thay vì tải hết rồi lọc ở
// client. requireAdminPage() (guard) giữ nguyên; getAdminOrderItems() giữ
// nguyên (đã tự phân trang trong query, không tải cả nghìn bản ghi 1 lúc).
const statusFilters: { key: OrderStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "ESCROW", label: "Đang ký quỹ" },
  { key: "RELEASED", label: "Hoàn thành" },
  { key: "DISPUTED", label: "Đang tranh chấp" },
  { key: "CANCELLED", label: "Đã huỷ" },
];

const toneOf: Record<OrderStatus, Tone> = {
  ESCROW: "warn",
  RELEASED: "success",
  DISPUTED: "danger",
  CANCELLED: "neutral",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; code?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const status = (statusFilters.some((f) => f.key === params.status) ? params.status : "ALL") as
    | OrderStatus
    | "ALL";
  const page = Math.max(1, Number(params.page) || 1);
  const code = params.code?.trim() || undefined;

  const { items, total, totalPages } = await getAdminOrderItems(status, page, code);
  type OrderRow = (typeof items)[number];

  const columns: Column<OrderRow>[] = [
    {
      key: "code",
      header: "Mã đơn",
      render: (i) => <span className="whitespace-nowrap font-mono text-xs font-bold text-[var(--adm-text)]">{i.orderCode}</span>,
    },
    {
      key: "product",
      header: "Sản phẩm",
      primary: true,
      render: (i) => (
        <div className="min-w-0">
          <p className="max-w-[280px] truncate font-bold text-[var(--adm-text)]">{i.productName}</p>
          {i.variantLabel && <p className="truncate text-xs text-[var(--adm-muted)]">{i.variantLabel}</p>}
        </div>
      ),
    },
    { key: "buyer", header: "Người mua", render: (i) => <span className="truncate text-[var(--adm-text)]">{i.buyerName}</span> },
    { key: "seller", header: "Người bán", render: (i) => <span className="truncate text-[var(--adm-text)]">{i.sellerName}</span> },
    {
      key: "amount",
      header: "Số tiền",
      align: "right",
      render: (i) => <span className="font-bold tabular-nums text-[var(--adm-brand)]">{formatVndDemo(i.price * i.quantity)}</span>,
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (i) => (
        <div>
          <StatusBadge tone={toneOf[i.status]} dot>{orderStatusLabel[i.status]}</StatusBadge>
          <OrderStatusTimeline orderItemId={i.id} variant="admin" />
        </div>
      ),
    },
    {
      key: "time",
      header: "Thời gian",
      render: (i) => <span className="text-xs text-[var(--adm-muted)]">{new Date(i.createdAt).toLocaleDateString("vi-VN")}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Đơn hàng & Ký quỹ"
        subtitle={`Duyệt toàn bộ ${total} mục đơn hàng trên nền tảng — lọc theo trạng thái, giải ngân ký quỹ đến hạn.`}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <AdminPreOrderRefundButton />
            <AdminEscrowReleaseButton />
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-full border border-[var(--adm-border)] bg-[var(--adm-surface-2)] p-1">
          {statusFilters.map((f) => (
            <Link
              key={f.key}
              href={`/admin/don-hang${f.key === "ALL" ? "" : `?status=${f.key}`}`}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                !code && status === f.key
                  ? "bg-[var(--adm-brand)] text-[#14141f]"
                  : "text-[var(--adm-muted)] hover:text-[var(--adm-text)]"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {/* Tra cứu đơn theo mã (AUDIT LỖ HỔNG 1) — admin dán mã buyer cung
            cấp qua chat/hỗ trợ ngoài luồng để nhảy thẳng tới đúng đơn, bỏ
            qua bộ lọc trạng thái. */}
        <form action="/admin/don-hang" method="GET" className="flex items-center gap-1.5">
          <input
            type="text"
            name="code"
            defaultValue={code ?? ""}
            placeholder="Tra cứu mã đơn (DH-XXXXXX)"
            className="w-52 rounded-full border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-3.5 py-1.5 text-xs font-semibold text-[var(--adm-text)] placeholder:text-[var(--adm-muted)] focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-full bg-[var(--adm-brand)] px-3.5 py-1.5 text-xs font-bold text-[#14141f] transition hover:opacity-90"
          >
            Tra cứu
          </button>
          {code && (
            <Link
              href="/admin/don-hang"
              className="rounded-full border border-[var(--adm-border)] px-3 py-1.5 text-xs font-bold text-[var(--adm-muted)] transition hover:text-[var(--adm-text)]"
            >
              Xoá
            </Link>
          )}
        </form>
      </div>

      <DataTable
        columns={columns}
        rows={items}
        rowKey={(i) => i.id}
        empty={<EmptyState icon={Inbox} title="Không có đơn hàng nào khớp bộ lọc">Thử đổi bộ lọc trạng thái khác.</EmptyState>}
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
                href={`/admin/don-hang?${status !== "ALL" ? `status=${status}&` : ""}page=${p}`}
                className={`grid h-8 w-8 place-items-center rounded-lg text-xs font-bold ${
                  p === page
                    ? "bg-[var(--adm-brand)] text-[#14141f]"
                    : "border border-[var(--adm-border)] bg-[var(--adm-surface-2)] text-[var(--adm-text)] hover:bg-white/10"
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

export const metadata = { title: "Đơn hàng & Ký quỹ — Admin Control Center — MarketMMO" };
