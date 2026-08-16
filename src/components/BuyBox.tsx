"use client";

import { AlertCircle, Check, Clock, LogIn, Minus, Plus, ShieldAlert, ShoppingBag } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import MegaSaleBadge from "@/components/MegaSaleBadge";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/data/products";
import { formatVnd } from "@/lib/format";

const MAX_QTY_CAP = 50;

export default function BuyBox({ product }: { product: Product }) {
  const variants = product.variants ?? [];
  const hasVariants = variants.length > 0;
  const firstInStock = variants.find((v) => v.stock > 0);

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    hasVariants ? (firstInStock ?? variants[0]).id : null
  );
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const { addItem } = useCart();
  const { data: session } = useSession();
  const router = useRouter();

  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? null;
  // Giá SAU Mega Sale (nếu đang sale) — variant.salePrice (kiểu PERCENT, đã
  // tính sẵn trong mapProduct()) hoặc product.megaSale.salePrice cho sản
  // phẩm không có variant. Đây LÀ giá gửi lên checkout/giỏ hàng — khớp đúng
  // giá tính tiền thật ở server (POST /api/checkout dùng chung
  // src/lib/mega-sale.ts), không lệch giữa hiển thị và số tiền bị trừ.
  const effectivePrice = selectedVariant
    ? (selectedVariant.salePrice ?? selectedVariant.price)
    : (product.megaSale?.active ? product.megaSale.salePrice : product.price);
  const effectiveStock = selectedVariant ? selectedVariant.stock : product.stock;
  const hasTimedStock = selectedVariant ? selectedVariant.hasTimedStock : product.hasTimedStock;
  const maxQty = Math.max(1, Math.min(effectiveStock, MAX_QTY_CAP));
  const canBuy = !hasVariants || (selectedVariant !== null && effectiveStock > 0);

  const handleAddToCart = () => {
    addItem(
      {
        productId: product.id,
        variantId: selectedVariant?.id,
        variantLabel: selectedVariant?.label,
        slug: product.slug,
        name: product.name,
        price: effectivePrice,
        seller: product.seller,
        stock: effectiveStock,
        imageUrl: product.imageUrl,
        categorySlug: product.categorySlug,
      },
      qty
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = async () => {
    if (!session) {
      router.push(`/dang-nhap?callbackUrl=/san-pham/${product.slug}`);
      return;
    }
    setCheckingOut(true);
    setCheckoutError(null);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ productId: product.id, variantId: selectedVariant?.id, quantity: qty }],
      }),
    });
    const data = await res.json();
    setCheckingOut(false);
    if (!res.ok) {
      setCheckoutError(data.error ?? "Không thể tạo đơn hàng.");
      return;
    }
    router.push("/don-hang");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Đặt trước — minh bạch cam kết giao + bảo hành TRƯỚC khi buyer bấm
          mua, và cảnh báo rõ cơ chế tự hoàn tiền nếu seller trễ hạn (xây lại
          2026-08-14, xem CLAUDE.md / POST /api/checkout). */}
      {product.preOrder && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-info/30 bg-info/10 px-3 py-2.5 text-xs text-foreground/85">
          <p className="flex items-center gap-1.5 font-black text-info">
            <Clock className="h-3.5 w-3.5" /> ĐẶT TRƯỚC — hàng chưa có sẵn
          </p>
          <p>
            Người bán cam kết giao trong{" "}
            <b className="font-bold text-foreground">
              {product.preOrderDeliveryValue ?? "?"}{" "}
              {product.preOrderDeliveryUnit === "hour" ? "giờ" : "ngày"}
            </b>{" "}
            kể từ lúc thanh toán, kèm{" "}
            <b className="font-bold text-foreground">
              bảo hành {product.warrantyValue} {product.warrantyUnit === "hour" ? "giờ" : "ngày"}
            </b>{" "}
            sau khi bạn xác nhận nhận hàng.
          </p>
          <p className="flex items-start gap-1.5 text-info">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Tiền của bạn được giữ ký quỹ, KHÔNG chuyển cho người bán ngay. Nếu quá hạn mà chưa
            giao, hệ thống TỰ ĐỘNG hoàn 100% tiền về ví bạn — bạn cũng có thể tự huỷ và nhận lại
            tiền bất kỳ lúc nào trước khi được giao.
          </p>
        </div>
      )}

      {hasVariants && (
        <div>
          <span className="mb-1.5 block text-xs font-bold uppercase text-foreground">
            Chọn loại sản phẩm
          </span>
          <div className="flex flex-col gap-2">
            {variants.map((v) => {
              const outOfStock = v.stock <= 0;
              const isSelected = v.id === selectedVariantId;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={outOfStock}
                  onClick={() => setSelectedVariantId(v.id)}
                  className={`rounded-lg border-2 px-3 py-2.5 text-left text-sm font-bold transition ${
                    outOfStock
                      ? "cursor-not-allowed border-border-c bg-surface-alt text-muted line-through"
                      : isSelected
                        ? "border-brand bg-brand text-ink"
                        : "border-border-c bg-surface text-foreground hover:border-brand-dark"
                  }`}
                >
                  {v.label}
                  <span className="mt-0.5 block text-xs font-semibold opacity-80">
                    {outOfStock ? (
                      "Hết hàng"
                    ) : v.salePrice !== undefined ? (
                      <>
                        <span className="mr-1 line-through opacity-70">{formatVnd(v.price)}</span>
                        {formatVnd(v.salePrice)}
                      </>
                    ) : (
                      formatVnd(v.price)
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          {selectedVariant && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {selectedVariant.salePrice !== undefined && (
                <>
                  <MegaSaleBadge percentOff={product.megaSale?.percentOff ?? 0} size="sm" />
                  <span className="text-sm text-muted line-through">{formatVnd(selectedVariant.price)}</span>
                </>
              )}
              <p className="text-2xl font-black text-danger">
                {formatVnd(selectedVariant.salePrice ?? selectedVariant.price)}
              </p>
            </div>
          )}
        </div>
      )}

      {hasTimedStock && (
        <div className="flex items-start gap-1.5 rounded-lg border border-info/30 bg-info/10 px-3 py-2 text-xs text-foreground/80">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" />
          <span>
            <b className="font-bold text-info">CÓ THỜI HẠN</b> — giá hiển thị là giá gói đầy đủ, giá
            thực tế tính theo số ngày còn lại của tài khoản, xem chi tiết ngay sau khi mua tại{" "}
            <span className="font-semibold">Đơn hàng</span>.
          </span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <span className="text-xs font-bold uppercase text-foreground">Số lượng</span>
        <div className="flex items-center rounded-lg border border-border-c">
          <button
            onClick={() => setQty((v) => Math.max(1, v - 1))}
            className="p-2 text-muted hover:text-foreground"
            aria-label="Giảm số lượng"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-10 text-center text-sm font-bold">{qty}</span>
          <button
            onClick={() => setQty((v) => Math.min(maxQty, v + 1))}
            className="p-2 text-muted hover:text-foreground"
            aria-label="Tăng số lượng"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          onClick={handleAddToCart}
          disabled={!canBuy}
          className={`ml-auto flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            added
              ? "border-success bg-success/10 text-success"
              : "border-ink text-foreground hover:bg-ink hover:text-white dark:border-border-c"
          }`}
        >
          {added ? (
            <>
              <Check className="h-3.5 w-3.5" /> Đã thêm
            </>
          ) : (
            <>
              <ShoppingBag className="h-3.5 w-3.5" /> Thêm giỏ hàng
            </>
          )}
        </button>
      </div>

      <p className="flex items-center gap-1.5 text-xs font-semibold text-danger">
        <AlertCircle className="h-3.5 w-3.5" /> Min: 1 | Max: {maxQty}
      </p>

      {checkoutError && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
          {checkoutError}
        </p>
      )}

      {session ? (
        <button
          onClick={handleBuyNow}
          disabled={checkingOut || !canBuy}
          className="flex items-center justify-center gap-2 rounded-full bg-brand py-3.5 text-base font-black text-ink transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ShoppingBag className="h-5 w-5" />
          {checkingOut ? "Đang xử lý..." : !canBuy ? "Hết hàng" : "Mua hàng"}
        </button>
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-lg border border-brand-dark/30 bg-brand-light/40 px-3 py-2.5 text-xs text-ink/80">
            ⚠️ Bạn cần{" "}
            <Link
              href={`/dang-nhap?callbackUrl=/san-pham/${product.slug}`}
              className="font-bold text-brand-dark underline"
            >
              đăng nhập
            </Link>{" "}
            để hoàn tất thanh toán
          </div>
          <Link
            href={`/dang-nhap?callbackUrl=/san-pham/${product.slug}`}
            className="flex items-center justify-center gap-2 rounded-full bg-brand py-3.5 text-base font-black text-ink transition hover:bg-brand-dark"
          >
            <LogIn className="h-5 w-5" /> Đăng nhập để mua ngay
          </Link>
        </>
      )}
    </div>
  );
}
