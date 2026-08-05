"use client";

import { AlertTriangle, LogIn, ShoppingBag } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Product } from "@/data/products";
import { formatVnd } from "@/lib/format";

// BuyBox RIÊNG cho sản phẩm loại "TUT_TRICK" (bán nội dung hướng dẫn/kiến
// thức) — đơn giản hơn BuyBox.tsx (không variant, không giỏ hàng) và
// ServiceBuyBox.tsx (không cần buyer nhập thông tin cho seller): mua thẳng
// số lượng 1 qua đúng POST /api/checkout đã dùng chung cho mọi loại hàng —
// server tự set deliveredPayload từ Product.tutTrickContent (xem checkout).
export default function TutTrickBuyBox({ product }: { product: Product }) {
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const { data: session } = useSession();
  const router = useRouter();

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
      body: JSON.stringify({ items: [{ productId: product.id, quantity: 1 }] }),
    });
    const data = await res.json().catch(() => null);
    setCheckingOut(false);
    if (!res.ok) {
      setCheckoutError(data?.error ?? "Không thể tạo đơn hàng.");
      return;
    }
    router.push("/don-hang");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-2xl font-black text-danger">{formatVnd(product.price)}</p>

      <div className="flex items-start gap-2.5 rounded-xl border border-info/30 bg-info/10 px-4 py-3.5">
        <ShoppingBag className="mt-0.5 h-4 w-4 shrink-0 text-info" />
        <p className="text-sm font-medium leading-relaxed text-foreground/90">
          Nội dung hướng dẫn đầy đủ (quy trình, cách làm) sẽ mở ngay sau khi
          bạn thanh toán — xem tại{" "}
          <span className="font-semibold">Đơn hàng</span>.
        </p>
      </div>

      {checkoutError && (
        <p className="flex items-center gap-1.5 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {checkoutError}
        </p>
      )}

      {session ? (
        <button
          onClick={handleBuyNow}
          disabled={checkingOut}
          className="flex items-center justify-center gap-2 rounded-full bg-brand py-3.5 text-base font-black text-ink transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ShoppingBag className="h-5 w-5" />
          {checkingOut ? "Đang xử lý..." : "Mua ngay"}
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
