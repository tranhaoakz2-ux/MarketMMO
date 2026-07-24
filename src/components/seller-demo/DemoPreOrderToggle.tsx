"use client";

import { Clock, Info, Package } from "lucide-react";
import { useState } from "react";
import { Card, SectionTitle } from "@/components/seller-demo/DemoKit";
import { SELLER_PRODUCTS } from "@/components/seller-demo/mock";

// Panel bật/tắt "Đặt trước" cho từng sản phẩm (demo). Dữ liệu giả, state cục bộ.
export default function DemoPreOrderToggle() {
  const [state, setState] = useState(() =>
    Object.fromEntries(SELLER_PRODUCTS.map((p) => [p.id, p.preOrder]))
  );

  return (
    <Card>
      <SectionTitle>Đánh dấu sản phẩm &quot;Đặt trước&quot;</SectionTitle>
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-border-c bg-surface-alt px-3 py-2.5 text-xs text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark" />
        Bật cho sản phẩm chưa có sẵn hàng — người mua vẫn thanh toán trước (tiền vào ký quỹ như
        đơn thường), hệ thống bỏ qua kiểm tra tồn kho.
      </div>
      <div className="flex flex-col gap-2">
        {SELLER_PRODUCTS.map((p) => {
          const on = state[p.id];
          return (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border-c bg-surface px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-alt text-muted">
                  <Package className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{p.name}</p>
                  <p className="text-[11px] text-muted">{p.categoryLabel}</p>
                </div>
              </div>
              <button
                onClick={() => setState((s) => ({ ...s, [p.id]: !on }))}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  on ? "bg-brand text-ink" : "bg-surface-alt text-muted hover:bg-border-c"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                {on ? "Đang đặt trước" : "Đánh dấu đặt trước"}
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
