import { PackageX } from "lucide-react";
import { formatVnd } from "@/lib/format";
import { orderStatusLabel, type OrderStatus } from "@/lib/constants";

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

const statusStyle: Record<OrderStatus, string> = {
  ESCROW: "bg-brand-light text-brand-dark",
  RELEASED: "bg-success/10 text-success",
  CANCELLED: "bg-danger/10 text-danger",
  DISPUTED: "bg-danger/10 text-danger",
};

export default function SellerOrdersTable({
  items,
  emptyLabel,
}: {
  items: SellerOrderItem[];
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border-c bg-surface p-10 text-center text-sm text-muted">
        <PackageX className="h-8 w-8 text-muted" />
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border-c bg-surface shadow-sm">
      <div className="grid min-w-[720px] grid-cols-6 gap-2 border-b border-border-c bg-surface-alt px-4 py-2.5 text-xs font-bold text-muted">
        <span className="col-span-2">Sản phẩm</span>
        <span>Người mua</span>
        <span>Ngày tạo</span>
        <span>Số tiền</span>
        <span>Trạng thái</span>
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          className="grid min-w-[720px] grid-cols-6 gap-2 border-b border-border-c px-4 py-3 text-sm last:border-0"
        >
          <div className="col-span-2 min-w-0">
            <p className="truncate font-semibold text-ink">{item.productName}</p>
            <p className="truncate text-xs text-muted">
              {item.variantLabel ? `${item.variantLabel} · ` : ""}
              {item.categoryName} · SL {item.quantity}
            </p>
          </div>
          <span className="truncate text-ink">{item.buyerName}</span>
          <span className="text-muted">{item.createdAt.toLocaleDateString("vi-VN")}</span>
          <span className="font-bold text-ink">{formatVnd(item.price * item.quantity)}</span>
          <span>
            <span
              className={`w-fit rounded-full px-2 py-0.5 text-xs font-bold ${statusStyle[item.status]}`}
            >
              {orderStatusLabel[item.status]}
            </span>
            {item.status === "ESCROW" && (
              <p className="mt-1 text-[11px] text-muted">
                Giải ngân dự kiến: {item.escrowReleaseAt.toLocaleDateString("vi-VN")}
              </p>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
