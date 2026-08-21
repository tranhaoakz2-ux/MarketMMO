"use client";

import { CheckCircle2, Clock, Eye, Loader2, PackageCheck, PackageX, X } from "lucide-react";
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
  Textarea,
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
  deliveryDeadline?: Date | null;
  hasDelivered?: boolean;
  manualDeliveryDeadline?: Date | null;
};

function deliveryMethodLabel(method: string): string {
  return SERVICE_DELIVERY_METHOD_LABEL[method as ServiceDeliveryMethod] ?? method;
}

const STATUS_TONE: Record<OrderStatus, Tone> = {
  ESCROW: "warn",
  AWAITING_SELLER_DELIVERY: "warn",
  RELEASED: "success",
  CANCELLED: "neutral",
  DISPUTED: "danger",
};

const FILTERS: { value: string; label: string }[] = [
  { value: "ALL", label: "Tất Cả" },
  { value: "ESCROW", label: "Đang Ký Quỹ" },
  { value: "RELEASED", label: "Hoàn Thành" },
  { value: "DISPUTED", label: "Tranh Chấp" },
];

const PAGE_SIZE = 8;

export default function SellerOrdersTable({
  items,
  emptyLabel,
  showServiceColumn = false,
  showPreOrderColumn = false,
  showManualProvisionColumn = false,
}: {
  items: SellerOrderItem[];
  emptyLabel: string;
  showServiceColumn?: boolean;
  showPreOrderColumn?: boolean;
  showManualProvisionColumn?: boolean;
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

  const [deliverItem, setDeliverItem] = useState<SellerOrderItem | null>(null);
  const [deliverContent, setDeliverContent] = useState("");
  const [deliverBusy, setDeliverBusy] = useState(false);
  const [deliverError, setDeliverError] = useState<string | null>(null);

  const [provisionItem, setProvisionItem] = useState<SellerOrderItem | null>(null);
  const [provisionForm, setProvisionForm] = useState({
    ip: "",
    port: "",
    username: "",
    password: "",
    sshKey: "",
    notes: "",
  });
  const [provisionBusy, setProvisionBusy] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);

  const openProvision = (o: SellerOrderItem) => {
    setProvisionItem(o);
    setProvisionForm({ ip: "", port: "", username: "", password: "", sshKey: "", notes: "" });
    setProvisionError(null);
  };
  const closeProvision = () => {
    setProvisionItem(null);
    setProvisionError(null);
  };
  const submitProvision = async () => {
    if (!provisionItem) return;
    if (!provisionForm.ip.trim() || !provisionForm.port.trim() || !provisionForm.username.trim() || !provisionForm.password.trim()) {
      setProvisionError("Vui lòng nhập đủ IP, Port, Username, Password.");
      return;
    }
    setProvisionBusy(true);
    setProvisionError(null);
    const res = await fetch(`/api/seller/orders/${provisionItem.id}/deliver-manual`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(provisionForm),
    });
    const data = await res.json().catch(() => null);
    setProvisionBusy(false);
    if (!res.ok) {
      setProvisionError(data?.error ?? "Không thể giao thông tin.");
      return;
    }
    setProvisionItem(null);
    router.refresh();
  };

  const openDeliver = (o: SellerOrderItem) => {
    setDeliverItem(o);
    setDeliverContent("");
    setDeliverError(null);
  };
  const closeDeliver = () => {
    setDeliverItem(null);
    setDeliverError(null);
  };
  const submitDeliver = async () => {
    if (!deliverItem) return;
    setDeliverBusy(true);
    setDeliverError(null);
    const res = await fetch(`/api/seller/orders/${deliverItem.id}/deliver-preorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: deliverContent }),
    });
    const data = await res.json().catch(() => null);
    setDeliverBusy(false);
    if (!res.ok) {
      setDeliverError(data?.error ?? "Không thể giao hàng.");
      return;
    }
    setDeliverItem(null);
    router.refresh();
  };

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
    ...(showPreOrderColumn
      ? [
          {
            key: "preorder",
            header: "Đặt trước",
            render: (o: SellerOrderItem) => {
              if (o.status === "CANCELLED") {
                return (
                  <span className="text-[10px] font-semibold text-muted">
                    Đã hoàn tiền (huỷ/quá hạn giao)
                  </span>
                );
              }
              if (o.hasDelivered) {
                return (
                  <div className="flex flex-col items-start gap-1">
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-success">
                      <PackageCheck className="h-3 w-3" /> Đã giao — chờ buyer nhận
                    </span>
                  </div>
                );
              }
              const overdue = o.deliveryDeadline ? o.deliveryDeadline <= new Date() : false;
              return (
                <div className="flex flex-col items-start gap-1">
                  {o.deliveryDeadline && (
                    <span className={`flex items-center gap-1 text-[10px] font-semibold ${overdue ? "text-danger" : "text-muted"}`}>
                      <Clock className="h-3 w-3" />
                      {overdue
                        ? "Đã quá hạn — chờ hệ thống tự hoàn tiền"
                        : `Hạn giao: ${o.deliveryDeadline.toLocaleString("vi-VN")}`}
                    </span>
                  )}
                  <Button size="sm" disabled={overdue} onClick={() => openDeliver(o)}>
                    <PackageCheck className="h-3.5 w-3.5" /> Giao hàng
                  </Button>
                </div>
              );
            },
          },
        ]
      : []),
    ...(showManualProvisionColumn
      ? [
          {
            key: "manual-provision",
            header: "Máy chủ (VPS)",
            render: (o: SellerOrderItem) => {
              if (o.status === "CANCELLED") {
                return (
                  <span className="text-[10px] font-semibold text-muted">
                    Đã hoàn tiền (quá hạn giao)
                  </span>
                );
              }
              if (o.status !== "AWAITING_SELLER_DELIVERY") {
                return (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-success">
                    <PackageCheck className="h-3 w-3" /> Đã giao — chờ buyer nhận
                  </span>
                );
              }
              const overdue = o.manualDeliveryDeadline ? o.manualDeliveryDeadline <= new Date() : false;
              return (
                <div className="flex flex-col items-start gap-1">
                  {o.manualDeliveryDeadline && (
                    <span className={`flex items-center gap-1 text-[10px] font-semibold ${overdue ? "text-danger" : "text-muted"}`}>
                      <Clock className="h-3 w-3" />
                      {overdue
                        ? "Đã quá hạn — chờ hệ thống tự hoàn tiền"
                        : `Hạn nhập: ${o.manualDeliveryDeadline.toLocaleString("vi-VN")}`}
                    </span>
                  )}
                  <Button size="sm" disabled={overdue} onClick={() => openProvision(o)}>
                    <PackageCheck className="h-3.5 w-3.5" /> Nhập thông tin server
                  </Button>
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

      {deliverItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closeDeliver}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border-c bg-surface p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-black text-foreground">
                  Giao hàng — {deliverItem.productName}
                </h3>
                <p className="mt-0.5 text-xs text-muted">
                  Nhập đúng {deliverItem.quantity} dòng nội dung (mỗi dòng ứng với 1 đơn vị buyer
                  đã mua). Buyer sẽ tự bấm lộ hàng để xem — bảo hành bắt đầu tính từ lúc đó.
                </p>
              </div>
              <button onClick={closeDeliver} className="shrink-0 text-muted hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <Textarea
              rows={Math.max(3, deliverItem.quantity)}
              value={deliverContent}
              onChange={(e) => setDeliverContent(e.target.value)}
              placeholder={`Dòng 1\nDòng 2\n...`}
            />
            {deliverError && (
              <p className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
                {deliverError}
              </p>
            )}
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="secondary" onClick={closeDeliver}>
                Huỷ
              </Button>
              <Button disabled={deliverBusy} onClick={submitDeliver}>
                {deliverBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Xác nhận đã giao
              </Button>
            </div>
          </div>
        </div>
      )}

      {provisionItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closeProvision}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border-c bg-surface p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-black text-foreground">
                  Nhập thông tin server — {provisionItem.productName}
                </h3>
                <p className="mt-0.5 text-xs text-muted">
                  Thông tin sẽ được mã hoá trước khi lưu. Buyer chỉ xem được sau khi bạn xác nhận,
                  bảo hành bắt đầu tính từ lúc buyer bấm xem.
                </p>
              </div>
              <button onClick={closeProvision} className="shrink-0 text-muted hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground">IP *</label>
                <input
                  type="text"
                  value={provisionForm.ip}
                  onChange={(e) => setProvisionForm((f) => ({ ...f, ip: e.target.value }))}
                  placeholder="VD: 103.10.20.30"
                  className="w-full rounded-lg border border-border-c px-2.5 py-2 text-xs bg-surface text-foreground focus:border-brand-dark focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground">Port *</label>
                <input
                  type="text"
                  value={provisionForm.port}
                  onChange={(e) => setProvisionForm((f) => ({ ...f, port: e.target.value }))}
                  placeholder="VD: 22"
                  className="w-full rounded-lg border border-border-c px-2.5 py-2 text-xs bg-surface text-foreground focus:border-brand-dark focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground">Username *</label>
                <input
                  type="text"
                  value={provisionForm.username}
                  onChange={(e) => setProvisionForm((f) => ({ ...f, username: e.target.value }))}
                  placeholder="VD: root"
                  className="w-full rounded-lg border border-border-c px-2.5 py-2 text-xs bg-surface text-foreground focus:border-brand-dark focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground">Password *</label>
                <input
                  type="text"
                  value={provisionForm.password}
                  onChange={(e) => setProvisionForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full rounded-lg border border-border-c px-2.5 py-2 text-xs bg-surface text-foreground focus:border-brand-dark focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-2.5">
              <label className="mb-1 block text-xs font-semibold text-foreground">SSH Key (tuỳ chọn)</label>
              <Textarea
                rows={2}
                value={provisionForm.sshKey}
                onChange={(e) => setProvisionForm((f) => ({ ...f, sshKey: e.target.value }))}
                placeholder="Dán private key nếu buyer đăng nhập bằng SSH key thay vì mật khẩu"
              />
            </div>
            <div className="mt-2.5">
              <label className="mb-1 block text-xs font-semibold text-foreground">Ghi chú (tuỳ chọn)</label>
              <Textarea
                rows={2}
                value={provisionForm.notes}
                onChange={(e) => setProvisionForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="VD: hướng dẫn đăng nhập lần đầu, lưu ý đổi mật khẩu..."
              />
            </div>

            {provisionError && (
              <p className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
                {provisionError}
              </p>
            )}
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="secondary" onClick={closeProvision}>
                Huỷ
              </Button>
              <Button disabled={provisionBusy} onClick={submitProvision}>
                {provisionBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Xác nhận đã giao
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
