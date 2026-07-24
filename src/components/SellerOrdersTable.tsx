"use client";

import { PackageX } from "lucide-react";
import { useMemo, useState } from "react";
import { orderStatusLabel, type OrderStatus } from "@/lib/constants";
import { formatVnd } from "@/lib/format";
import {
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

type SellerOrderItem = {
  id: string;
  orderId: string;
  productName: string;
  variantLabel: string | null;
  categoryName: string;
  buyerName: string;
  quantity: number;
  price: number;
  status: OrderStatus;
  escrowReleaseAt: Date;
  createdAt: Date;
};

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
}: {
  items: SellerOrderItem[];
  emptyLabel: string;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () =>
      items.filter(
        (o) =>
          (status === "ALL" || o.status === status) &&
          (o.productName.toLowerCase().includes(q.toLowerCase()) ||
            o.buyerName.toLowerCase().includes(q.toLowerCase()) ||
            o.orderId.toLowerCase().includes(q.toLowerCase()))
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
            {o.categoryName} · SL {o.quantity} · #{o.orderId.slice(-8).toUpperCase()}
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
        </div>
      ),
    },
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
    </div>
  );
}
