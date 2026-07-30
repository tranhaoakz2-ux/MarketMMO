"use client";

import { Flame, X } from "lucide-react";
import { useState } from "react";
import MegaSaleBadge from "@/components/MegaSaleBadge";
import type { Product } from "@/data/products";
import { formatVnd } from "@/lib/format";
import { computeEffectivePrice } from "@/lib/mega-sale";

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Modal cấu hình Mega Sale — seller TOÀN QUYỀN tự quyết % (hoặc giá trực
// tiếp), thủ công hay hẹn giờ. Áp dụng cho CẢ SẢN PHẨM (price/priceMax/mọi
// variant.price cùng lúc theo %) — không tách riêng từng variant, xem
// src/lib/mega-sale.ts.
export default function MegaSaleModal({
  product,
  onClose,
  onChanged,
}: {
  product: Product;
  onClose: () => void;
  onChanged: () => void;
}) {
  const cfg = product.megaSaleConfig;
  const hasVariants = (product.variants?.length ?? 0) > 0;
  const canUseFixed = !product.priceMax && !hasVariants;

  const [active, setActive] = useState(cfg?.active ?? false);
  const [type, setType] = useState<"PERCENT" | "FIXED">(
    cfg?.type === "FIXED" && canUseFixed ? "FIXED" : "PERCENT"
  );
  const [percent, setPercent] = useState(cfg?.percent != null ? String(cfg.percent) : "");
  const [fixedPrice, setFixedPrice] = useState(cfg?.fixedPrice != null ? String(cfg.fixedPrice) : "");
  const [timerMode, setTimerMode] = useState<"MANUAL" | "TIMED">(cfg?.endsAt ? "TIMED" : "MANUAL");
  const [endsAtLocal, setEndsAtLocal] = useState(cfg?.endsAt ? toDatetimeLocalValue(cfg.endsAt) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const percentNum = Number(percent);
  const fixedPriceNum = Number(fixedPrice);
  const previewValid =
    type === "PERCENT" ? Number.isInteger(percentNum) && percentNum >= 1 && percentNum <= 99 : Number.isFinite(fixedPriceNum) && fixedPriceNum > 0;
  const preview = previewValid
    ? computeEffectivePrice(product.price, {
        megaSaleActive: true,
        megaSaleType: type,
        megaSalePercent: type === "PERCENT" ? percentNum : null,
        megaSaleFixedPrice: type === "FIXED" ? fixedPriceNum : null,
        megaSaleEndsAt: null,
      })
    : null;

  const submit = async () => {
    setError(null);
    if (active) {
      if (type === "PERCENT" && (!Number.isInteger(percentNum) || percentNum < 1 || percentNum > 99)) {
        setError("Phần trăm giảm phải là số nguyên từ 1 đến 99.");
        return;
      }
      if (type === "FIXED" && (!Number.isInteger(fixedPriceNum) || fixedPriceNum <= 0)) {
        setError("Vui lòng nhập giá sale hợp lệ.");
        return;
      }
      if (timerMode === "TIMED" && !endsAtLocal) {
        setError("Vui lòng chọn ngày giờ kết thúc, hoặc chuyển sang Thủ công.");
        return;
      }
    }

    setLoading(true);
    const res = await fetch(`/api/seller/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        megaSale: active
          ? {
              active: true,
              type,
              percent: type === "PERCENT" ? percentNum : undefined,
              fixedPrice: type === "FIXED" ? fixedPriceNum : undefined,
              endsAt: timerMode === "TIMED" ? new Date(endsAtLocal).toISOString() : null,
            }
          : { active: false },
      }),
    });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(data?.error ?? "Không thể lưu cấu hình Mega Sale.");
      return;
    }
    onChanged();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border-c bg-surface p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 text-base font-black text-foreground">
              <Flame className="h-4 w-4 text-orange-500" /> Mega Sale
            </h3>
            <p className="mt-0.5 truncate text-xs text-muted">{product.name}</p>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-full p-1.5 text-muted hover:bg-surface-alt hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="flex items-center gap-2 rounded-lg border border-border-c bg-surface-alt px-3 py-2.5">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
          <span className="text-sm font-bold text-foreground">Bật Mega Sale cho sản phẩm này</span>
        </label>

        {active && (
          <div className="mt-3 flex flex-col gap-3">
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase text-foreground">Kiểu giảm giá</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setType("PERCENT")}
                  className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-bold transition ${
                    type === "PERCENT" ? "border-brand bg-brand text-ink" : "border-border-c text-foreground hover:border-brand-dark"
                  }`}
                >
                  Theo %
                </button>
                <button
                  type="button"
                  disabled={!canUseFixed}
                  onClick={() => setType("FIXED")}
                  title={!canUseFixed ? "Chỉ áp dụng cho sản phẩm 1 mức giá (không khoảng giá, không phiên bản)" : undefined}
                  className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    type === "FIXED" ? "border-brand bg-brand text-ink" : "border-border-c text-foreground hover:border-brand-dark"
                  }`}
                >
                  Giá trực tiếp
                </button>
              </div>
              {!canUseFixed && (
                <p className="mt-1 text-[11px] text-muted">
                  Sản phẩm có khoảng giá/nhiều phiên bản chỉ dùng được kiểu Theo % (áp đồng loạt lên mọi mức giá).
                </p>
              )}
            </div>

            {type === "PERCENT" ? (
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-foreground">Phần trăm giảm (1-99%)</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                  placeholder="VD: 30"
                  className="w-full rounded-lg border border-border-c px-3 py-2 text-sm bg-surface text-foreground focus:border-brand-dark focus:outline-none"
                />
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-foreground">
                  Giá sale (hiện tại: {formatVnd(product.price)})
                </label>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={fixedPrice}
                  onChange={(e) => setFixedPrice(e.target.value)}
                  placeholder="Giá sau giảm (đ)"
                  className="w-full rounded-lg border border-border-c px-3 py-2 text-sm bg-surface text-foreground focus:border-brand-dark focus:outline-none"
                />
              </div>
            )}

            {preview && preview.isSaleActive && (
              <div className="flex items-center gap-2 rounded-lg bg-brand-light/20 px-3 py-2">
                <MegaSaleBadge percentOff={preview.percentOff ?? 0} size="sm" />
                <span className="text-xs text-muted line-through">{formatVnd(product.price)}</span>
                <span className="text-sm font-black text-danger">{formatVnd(preview.price)}</span>
              </div>
            )}

            <div>
              <p className="mb-1.5 text-xs font-bold uppercase text-foreground">Thời hạn</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTimerMode("MANUAL")}
                  className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-bold transition ${
                    timerMode === "MANUAL" ? "border-brand bg-brand text-ink" : "border-border-c text-foreground hover:border-brand-dark"
                  }`}
                >
                  Thủ công
                </button>
                <button
                  type="button"
                  onClick={() => setTimerMode("TIMED")}
                  className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-bold transition ${
                    timerMode === "TIMED" ? "border-brand bg-brand text-ink" : "border-border-c text-foreground hover:border-brand-dark"
                  }`}
                >
                  Hẹn giờ
                </button>
              </div>
              <p className="mt-1 text-[11px] text-muted">
                {timerMode === "MANUAL"
                  ? "Sale kéo dài đến khi bạn tự tắt."
                  : "Tới đúng thời điểm này, giá tự động về giá gốc — không cần bạn thao tác gì thêm."}
              </p>
              {timerMode === "TIMED" && (
                <input
                  type="datetime-local"
                  value={endsAtLocal}
                  onChange={(e) => setEndsAtLocal(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border-c px-3 py-2 text-sm bg-surface text-foreground focus:border-brand-dark focus:outline-none"
                />
              )}
            </div>
          </div>
        )}

        {error && <p className="mt-3 text-xs font-semibold text-danger">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-bold text-muted hover:text-foreground">
            Huỷ
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-ink hover:bg-brand-dark disabled:opacity-60"
          >
            {loading ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}
