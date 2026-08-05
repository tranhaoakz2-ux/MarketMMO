"use client";

import { History, Loader2 } from "lucide-react";
import { useState } from "react";
import { orderStatusLabel, type OrderStatus } from "@/lib/constants";

type HistoryRow = {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actorType: "BUYER" | "SELLER" | "ADMIN" | "SYSTEM";
  note: string | null;
  createdAt: string;
};

const ACTOR_LABEL: Record<HistoryRow["actorType"], string> = {
  BUYER: "Người mua",
  SELLER: "Người bán",
  ADMIN: "Quản trị viên",
  SYSTEM: "Hệ thống",
};

// Timeline lịch sử đổi trạng thái đơn — dùng chung cho buyer (/don-hang),
// seller (SellerOrdersTable), admin (/admin/don-hang). Bấm mở mới gọi API
// (không nhúng sẵn — tránh tải dữ liệu không cần thiết cho mọi dòng cùng
// lúc). KHÔNG hiển thị tên/email actor cụ thể, chỉ vai trò — xem
// GET /api/orders/[orderItemId]/status-history. AUDIT LỖ HỔNG 3.
//
// `variant="admin"` đổi sang class theo token --adm-* (theme tối riêng của
// Admin Control Center, xem .admin-shell trong globals.css — KHÔNG override
// các token thường như --color-muted nên tái dùng nguyên class site sẽ ra
// màu sáng lạc quẻ trên nền tối admin).
export default function OrderStatusTimeline({
  orderItemId,
  variant = "site",
}: {
  orderItemId: string;
  variant?: "site" | "admin";
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<HistoryRow[]>([]);

  const handleOpen = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/orders/${orderItemId}/status-history`);
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(data?.error ?? "Không thể tải lịch sử trạng thái.");
      return;
    }
    setRows(data.history ?? []);
  };

  const isAdmin = variant === "admin";
  const mutedCls = isAdmin ? "text-[var(--adm-muted)]" : "text-muted";
  const textCls = isAdmin ? "text-[var(--adm-text)]" : "text-foreground";
  const boxCls = isAdmin
    ? "border-[var(--adm-border)] bg-[var(--adm-surface-2)]"
    : "border-border-c bg-surface-alt";
  const rowCls = isAdmin ? "border-[var(--adm-border)] bg-[var(--adm-surface)]" : "border-border-c bg-surface";
  const dangerCls = isAdmin ? "text-[var(--adm-danger)]" : "text-danger";
  const buttonCls = isAdmin
    ? "flex items-center gap-1 text-[10px] font-semibold text-[var(--adm-muted)] hover:text-[var(--adm-text)] hover:underline"
    : "flex items-center gap-1 text-[10px] font-semibold text-muted hover:text-foreground hover:underline";

  return (
    <div className="mt-1">
      <button onClick={handleOpen} className={buttonCls}>
        <History className="h-3 w-3" /> {open ? "Ẩn lịch sử trạng thái" : "Xem lịch sử trạng thái"}
      </button>
      {open && (
        <div className={`mt-1.5 flex w-64 flex-col gap-1.5 rounded-lg border p-2 ${boxCls}`}>
          {loading && (
            <p className={`flex items-center gap-1.5 text-[10px] ${mutedCls}`}>
              <Loader2 className="h-3 w-3 animate-spin" /> Đang tải...
            </p>
          )}
          {error && <p className={`text-[10px] font-semibold ${dangerCls}`}>{error}</p>}
          {!loading && !error && rows.length === 0 && (
            <p className={`text-[10px] ${mutedCls}`}>Chưa có lịch sử.</p>
          )}
          {!loading &&
            !error &&
            rows.map((row, idx) => (
              <div key={idx} className={`rounded border px-2 py-1 ${rowCls}`}>
                <p className={`text-[11px] font-semibold ${textCls}`}>
                  {row.fromStatus ? `${orderStatusLabel[row.fromStatus]} → ` : ""}
                  {orderStatusLabel[row.toStatus]}
                </p>
                <p className={`text-[10px] ${mutedCls}`}>
                  {ACTOR_LABEL[row.actorType]} · {new Date(row.createdAt).toLocaleString("vi-VN")}
                </p>
                {row.note && <p className={`text-[10px] ${mutedCls}`}>{row.note}</p>}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
