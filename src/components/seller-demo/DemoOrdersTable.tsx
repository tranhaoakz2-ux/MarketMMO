"use client";

import { PackageX } from "lucide-react";
import { useMemo, useState } from "react";
import { orderStatusLabel, type OrderStatus } from "@/lib/constants";
import {
  Column,
  DataTable,
  EmptyState,
  FilterBar,
  Pagination,
  SearchInput,
  Segmented,
  StatusBadge,
  formatVndDemo,
} from "@/components/seller-demo/DemoKit";
import { ORDER_STATUS_TONE, type DemoOrder } from "@/components/seller-demo/mock";

const FILTERS: { value: string; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "ESCROW", label: "Đang ký quỹ" },
  { value: "RELEASED", label: "Hoàn thành" },
  { value: "DISPUTED", label: "Tranh chấp" },
];

const PAGE_SIZE = 6;

export default function DemoOrdersTable({
  items,
  emptyLabel,
}: {
  items: DemoOrder[];
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

  const columns: Column<DemoOrder>[] = [
    {
      key: "product",
      header: "Sản phẩm",
      primary: true,
      render: (o) => (
        <div className="min-w-0">
          <p className="max-w-[320px] truncate font-semibold text-foreground">{o.productName}</p>
          <p className="truncate text-[11px] text-muted">
            {o.variantLabel ? `${o.variantLabel} · ` : ""}
            {o.categoryName} · SL {o.quantity} · #{o.orderId}
          </p>
        </div>
      ),
    },
    { key: "buyer", header: "Người mua", render: (o) => <span className="text-foreground">{o.buyerName}</span> },
    { key: "date", header: "Ngày tạo", render: (o) => <span className="whitespace-nowrap text-muted">{o.createdAt}</span> },
    {
      key: "amount",
      header: "Số tiền",
      align: "right",
      render: (o) => <span className="whitespace-nowrap font-bold tabular-nums text-foreground">{formatVndDemo(o.price * o.quantity)}</span>,
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (o) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge tone={ORDER_STATUS_TONE[o.status]} dot>
            {orderStatusLabel[o.status as OrderStatus]}
          </StatusBadge>
          {o.status === "ESCROW" && o.escrowReleaseAt && (
            <span className="text-[10px] text-muted">Giải ngân: {o.escrowReleaseAt}</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <FilterBar>
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Tìm sản phẩm / người mua / mã đơn..." />
        <Segmented value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={FILTERS} />
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
