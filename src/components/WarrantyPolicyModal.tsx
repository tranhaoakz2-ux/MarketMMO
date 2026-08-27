"use client";

import { Lock, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/data/products";
import { PRODUCT_WARRANTY_POLICY_MAX_LENGTH } from "@/lib/constants";

// Modal sửa Chính sách bảo hành (Product.warrantyPolicy) — CHỈ dùng được khi
// sản phẩm CHƯA có đơn nào (product.warrantyPolicyLocked === false, tính sẵn
// ở getMySellerProducts()). Đã có đơn -> hiện thông báo khoá, KHÔNG cho sửa —
// chống seller hạ chính sách sau khi buyer đã mua dựa trên chính sách ban
// đầu. Cờ `warrantyPolicyLocked` CHỈ để hiện UI; chốt chặn thật nằm ở server
// (PATCH /api/seller/products/[productId], xem route đó).
export default function WarrantyPolicyModal({
  product,
  onClose,
  onChanged,
}: {
  product: Product;
  onClose: () => void;
  onChanged: () => void;
}) {
  const locked = product.warrantyPolicyLocked === true;
  const [value, setValue] = useState(product.warrantyPolicy ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (value.trim().length > PRODUCT_WARRANTY_POLICY_MAX_LENGTH) {
      setError(`Chính sách bảo hành tối đa ${PRODUCT_WARRANTY_POLICY_MAX_LENGTH.toLocaleString("vi-VN")} ký tự.`);
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/seller/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ warrantyPolicy: value.trim() }),
    });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(data?.error ?? "Không thể lưu chính sách bảo hành.");
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
              <ShieldCheck className="h-4 w-4 text-brand-dark" /> Chính sách bảo hành
            </h3>
            <p className="mt-0.5 truncate text-xs text-muted">{product.name}</p>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-full p-1.5 text-muted hover:bg-surface-alt hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {locked ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-dashed border-border-c bg-surface-alt p-3.5">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
            <p className="text-sm text-foreground/80">
              Đã có đơn hàng, không thể sửa chính sách bảo hành để bảo vệ người mua.
            </p>
          </div>
        ) : (
          <>
            <p className="text-[11px] text-muted">
              Sản phẩm chưa có đơn nào — bạn vẫn sửa được để chỉnh lỗi chính tả trước khi ai mua.
              Ngay khi có đơn đầu tiên, nội dung này sẽ KHOÁ VĨNH VIỄN.
            </p>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={PRODUCT_WARRANTY_POLICY_MAX_LENGTH}
              rows={5}
              placeholder="VD: Bảo hành trong bao lâu, điều kiện đổi/hoàn, trường hợp không bảo hành..."
              className="mt-2 w-full rounded-lg border border-border-c px-3 py-2 text-sm bg-surface text-foreground focus:border-brand-dark focus:outline-none"
            />
            <p className="mt-1 text-right text-[11px] text-muted">
              {value.length}/{PRODUCT_WARRANTY_POLICY_MAX_LENGTH}
            </p>
          </>
        )}

        {error && <p className="mt-3 text-xs font-semibold text-danger">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-bold text-muted hover:text-foreground">
            {locked ? "Đóng" : "Huỷ"}
          </button>
          {!locked && (
            <button
              onClick={submit}
              disabled={loading}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-ink hover:bg-brand-dark disabled:opacity-60"
            >
              {loading ? "Đang lưu..." : "Lưu"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
