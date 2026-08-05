"use client";

import { CheckCircle2, Eye, Loader2, PackageX, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  orderStatusLabel,
  SERVICE_DELIVERY_METHOD_LABEL,
  type OrderStatus,
  type ServiceDeliveryMethod,
} from "@/lib/constants";
import { formatVnd } from "@/lib/format";
import OrderStatusTimeline from "@/components/OrderStatusTimeline";
import {
  Button,
  Column,
  DataTable,
  EmptyState,
  FilterBar,
  Pagination,
  SearchInput,
  Segmented,
  StatusBadge,
  Tone,
} from "@/components/seller-demo/DemoKit";

type ServiceIntakeSummary = {
  deliveryMethod: string;
  publicFields: Record<string, string>;
  hasSecretFields: boolean;
  sellerAcceptedAt: Date | null;
  sensitiveRevealDeadline: Date | null;
  sensitivePurgedAt: Date | null;
};

type SellerOrderItem = {
  id: string;
  orderId: string;
  orderCode: string;
  productName: string;
  variantLabel: string | null;
  categoryName: string;
  buyerName: string;
  quantity: number;
  price: number;
  status: OrderStatus;
  escrowReleaseAt: Date;
  createdAt: Date;
  serviceIntake?: ServiceIntakeSummary | null;
};

function deliveryMethodLabel(method: string): string {
  return SERVICE_DELIVERY_METHOD_LABEL[method as ServiceDeliveryMethod] ?? method;
}

const STATUS_TONE: Record<OrderStatus, Tone> = {
  ESCROW: "warn",
  RELEASED: "success",
  CANCELLED: "neutral",
  DISPUTED: "danger",
};

const FILTERS: { value: string; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "ESCROW", label: "Đang ký quỹ" },
  { value: "RELEASED", label: "Hoàn thành" },
  { value: "DISPUTED", label: "Tranh chấp" },
];

const PAGE_SIZE = 8;

export default function SellerOrdersTable({
  items,
  emptyLabel,
  showServiceColumn = false,
}: {
  items: SellerOrderItem[];
  emptyLabel: string;
  showServiceColumn?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [revealItem, setRevealItem] = useState<SellerOrderItem | null>(null);
  const [revealLoading, setRevealLoading] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [revealData, setRevealData] = useState<{
    publicFields: Record<string, string>;
    secretFields: Record<string, string>;
    fieldLabels: Record<string, string>;
  } | null>(null);

  const handleAccept = async (orderItemId: string) => {
    setAcceptingId(orderItemId);
    const res = await fetch(`/api/seller/orders/${orderItemId}/accept`, { method: "POST" });
    const data = await res.json().catch(() => null);
    setAcceptingId(null);
    if (!res.ok) {
      alert(data?.error ?? "Không thể nhận đơn.");
      return;
    }
    router.refresh();
  };

  const openReveal = async (item: SellerOrderItem) => {
    setRevealItem(item);
    setRevealData(null);
    setRevealError(null);
    setRevealLoading(true);
    const res = await fetch(`/api/seller/orders/${item.id}/reveal-credentials`, { method: "POST" });
    const data = await res.json().catch(() => null);
    setRevealLoading(false);
    if (!res.ok) {
      setRevealError(data?.error ?? "Không thể tải thông tin.");
      return;
    }
    setRevealData(data);
  };

  const closeReveal = () => {
    setRevealItem(null);
    setRevealData(null);
    setRevealError(null);
  };

  const filtered = useMemo(
    () =>
      items.filter(
        (o) =>
          (status === "ALL" || o.status === status) &&
          (o.productName.toLowerCase().includes(q.toLowerCase()) ||
            o.buyerName.toLowerCase().includes(q.toLowerCase()) ||
            o.orderCode.toLowerCase().includes(q.toLowerCase()))
      ),
    [items, q, status]
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const columns: Column<SellerOrderItem>[] = [
    {
      key: "product",
      header: "Sản phẩm",
      primary: true,
      render: (o) => (
        <div className="min-w-0">
          <p className="max-w-[320px] truncate font-semibold text-foreground">{o.productName}</p>
          <p className="truncate text-[11px] text-muted">
            {o.variantLabel ? `${o.variantLabel} · ` : ""}
            {o.categoryName} · SL {o.quantity} · {o.orderCode}
          </p>
        </div>
      ),
    },
    { key: "buyer", header: "Người mua", render: (o) => <span className="truncate text-foreground">{o.buyerName}</span> },
    {
      key: "date",
      header: "Ngày tạo",
      render: (o) => <span className="whitespace-nowrap text-muted">{o.createdAt.toLocaleDateString("vi-VN")}</span>,
    },
    {
      key: "amount",
      header: "Số tiền",
      align: "right",
      render: (o) => (
        <span className="whitespace-nowrap font-bold tabular-nums text-foreground">{formatVnd(o.price * o.quantity)}</span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (o) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge tone={STATUS_TONE[o.status]} dot>
            {orderStatusLabel[o.status]}
          </StatusBadge>
          {o.status === "ESCROW" && (
            <span className="text-[10px] text-muted">Giải ngân: {o.escrowReleaseAt.toLocaleDateString("vi-VN")}</span>
          )}
          <OrderStatusTimeline orderItemId={o.id} />
        </div>
      ),
    },
    ...(showServiceColumn
      ? [
          {
            key: "service",
            header: "Dịch vụ",
            render: (o: SellerOrderItem) => {
              const si = o.serviceIntake;
              if (!si) return <span className="text-xs text-muted">—</span>;
              if (!si.sellerAcceptedAt) {
                return (
                  <Button
                    size="sm"
                    disabled={acceptingId === o.id || o.status !== "ESCROW"}
                    onClick={() => handleAccept(o.id)}
                  >
                    {acceptingId === o.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Nhận đơn
                  </Button>
                );
              }
              const expired = si.sensitiveRevealDeadline
                ? new Date(si.sensitiveRevealDeadline) < new Date()
                : false;
              return (
                <div className="flex flex-col items-start gap-1">
                  <span className="text-[10px] text-muted">{deliveryMethodLabel(si.deliveryMethod)}</span>
                  <Button size="sm" variant="secondary" onClick={() => openReveal(o)}>
                    <Eye className="h-3.5 w-3.5" /> Xem thông tin
                  </Button>
                  {si.sensitivePurgedAt ? (
                    <span className="text-[10px] text-muted">Đã xoá thông tin nhạy cảm</span>
                  ) : (
                    si.hasSecretFields && (
                      <span className={`text-[10px] ${expired ? "text-danger" : "text-muted"}`}>
                        {expired
                          ? "Đã hết hạn xem"
                          : `Hạn xem: ${si.sensitiveRevealDeadline?.toLocaleString("vi-VN")}`}
                      </span>
                    )
                  )}
                </div>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <FilterBar>
        <SearchInput
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
          placeholder="Tìm sản phẩm / người mua / mã đơn..."
        />
        <Segmented
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={FILTERS}
        />
      </FilterBar>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(o) => o.id}
        empty={<EmptyState icon={PackageX} title="Chưa có đơn hàng">{emptyLabel}</EmptyState>}
      />

      <Pagination page={safePage} totalPages={totalPages} onPage={setPage} />

      {revealItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closeReveal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border-c bg-surface p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-black text-foreground">{revealItem.productName}</h3>
                <p className="mt-0.5 text-xs text-muted">
                  Bàn giao: {deliveryMethodLabel(revealItem.serviceIntake?.deliveryMethod ?? "")}
                </p>
              </div>
              <button onClick={closeReveal} className="shrink-0 text-muted hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {revealLoading && (
              <p className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
              </p>
            )}
            {revealError && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
                {revealError}
              </p>
            )}
            {revealData && (
              <div className="flex flex-col gap-3">
                {Object.keys(revealData.publicFields).length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase text-muted">Thông tin chung</p>
                    <div className="flex flex-col gap-1.5 rounded-lg border border-border-c bg-surface-alt p-3">
                      {Object.entries(revealData.publicFields).map(([k, v]) => (
                        <p key={k} className="break-words text-sm text-foreground">
                          <b className="font-semibold">{revealData.fieldLabels[k] ?? k}:</b> {v}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {Object.keys(revealData.secretFields).length > 0 ? (
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase text-danger">Thông tin nhạy cảm</p>
                    <div className="flex flex-col gap-1.5 rounded-lg border border-danger/30 bg-danger/5 p-3">
                      {Object.entries(revealData.secretFields).map(([k, v]) => (
                        <p key={k} className="break-words text-sm text-foreground">
                          <b className="font-semibold">{revealData.fieldLabels[k] ?? k}:</b> {v}
                        </p>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[10px] text-muted">Lượt xem này đã được ghi lại vào nhật ký.</p>
                  </div>
                ) : (
                  revealItem.serviceIntake?.hasSecretFields && (
                    <p className="text-xs text-muted">
                      Thông tin nhạy cảm của đơn này đã bị xoá (đã hoàn tất hoặc quá hạn xem).
                    </p>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
