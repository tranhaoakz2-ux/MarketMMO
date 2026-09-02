"use client";

import {
  Loader2,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Breadcrumb from "@/components/Breadcrumb";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ProductThumbnail from "@/components/ProductThumbnail";
import Reveal from "@/components/Reveal";
import { useCart } from "@/context/CartContext";
import { formatVnd } from "@/lib/format";

export default function CartPage() {
  const { lines, subtotal, removeItem, setQuantity, clear } = useCart();
  const { data: session } = useSession();
  const router = useRouter();
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [discountInput, setDiscountInput] = useState("");
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    amount: number;
    sellerName: string;
  } | null>(null);

  const cartItemsPayload = lines.map((l) => ({
    productId: l.productId,
    variantId: l.variantId,
    quantity: l.quantity,
  }));

  const handleApplyDiscount = async () => {
    if (!discountInput.trim()) return;
    setDiscountError(null);
    setApplyingDiscount(true);
    const res = await fetch("/api/discount-codes/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: discountInput.trim(), items: cartItemsPayload }),
    });
    const data = await res.json();
    setApplyingDiscount(false);
    // Preview trả phản hồi ĐỒNG NHẤT (status 200) để chống oracle dò mã: mã
    // không hợp lệ/không áp dụng đều là { valid:false }. 429 khi vượt rate-limit.
    if (!res.ok) {
      setDiscountError(data.error ?? "Bạn thử quá nhiều lần, vui lòng chờ giây lát.");
      setAppliedDiscount(null);
      return;
    }
    if (!data.valid) {
      setDiscountError("Mã giảm giá không hợp lệ hoặc không áp dụng cho giỏ hàng này.");
      setAppliedDiscount(null);
      return;
    }
    setAppliedDiscount({
      code: discountInput.trim().toUpperCase(),
      amount: data.discountAmount,
      sellerName: data.sellerName,
    });
  };

  const total = subtotal - (appliedDiscount?.amount ?? 0);

  const handleCheckout = async () => {
    setError(null);
    setCheckingOut(true);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cartItemsPayload,
        discountCode: appliedDiscount?.code,
      }),
    });
    const data = await res.json();
    setCheckingOut(false);
    if (!res.ok) {
      setError(data.error ?? "Thanh toán thất bại.");
      return;
    }
    clear();
    router.push("/don-hang");
    router.refresh();
  };

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Giỏ hàng" }]} />
        </div>

        <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
          <Reveal>
            <h1 className="mb-6 flex items-center gap-2.5 text-2xl font-black text-foreground">
              <ShoppingBag className="h-6 w-6 text-brand-dark" strokeWidth={2.2} />
              Giỏ hàng
              {lines.length > 0 && (
                <span className="rounded-full bg-brand px-2.5 py-0.5 text-sm font-bold text-ink">
                  {lines.length}
                </span>
              )}
            </h1>
          </Reveal>

          {lines.length === 0 ? (
            <Reveal>
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border-c bg-surface px-6 py-16 text-center shadow-sm">
                <span className="grid h-20 w-20 place-items-center rounded-full bg-brand-light/40 ring-1 ring-brand-dark/20">
                  <ShoppingCart className="h-9 w-9 text-brand-dark" strokeWidth={1.5} />
                </span>
                <div>
                  <p className="text-base font-bold text-foreground">Giỏ hàng của bạn đang trống</p>
                  <p className="mt-1 text-sm text-muted">
                    Khám phá hàng ngàn sản phẩm số và bắt đầu mua sắm ngay.
                  </p>
                </div>
                <Link
                  href="/"
                  className="mt-2 flex items-center gap-1.5 rounded-full bg-brand px-6 py-3 text-sm font-black text-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md"
                >
                  Tiếp tục mua sắm
                </Link>
              </div>
            </Reveal>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
              <Reveal>
                <div className="flex flex-col gap-3">
                  {lines.map((line) => (
                    <div
                      key={`${line.productId}:${line.variantId ?? ""}`}
                      className="flex gap-4 rounded-2xl border border-border-c bg-surface p-4 shadow-sm transition-all duration-300 hover:border-brand-dark/50 hover:shadow-[0_12px_28px_rgba(43,176,191,0.12),0_4px_10px_rgba(0,0,0,0.04)]"
                    >
                      <Link href={`/san-pham/${line.slug}`} className="shrink-0">
                        <ProductThumbnail
                          imageUrl={line.imageUrl}
                          categorySlug={line.categorySlug ?? ""}
                          boxClassName="h-24 w-24 sm:h-28 sm:w-28 rounded-xl bg-surface-alt ring-1 ring-border-c"
                          iconClassName="h-9 w-9 text-foreground/60 sm:h-10 sm:w-10"
                          sizes="(min-width: 640px) 112px, 96px"
                        />
                      </Link>

                      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            href={`/san-pham/${line.slug}`}
                            className="line-clamp-2 text-sm font-bold leading-snug text-foreground transition-colors hover:text-brand-dark sm:text-base"
                          >
                            {line.name}
                          </Link>
                          {line.variantLabel && (
                            <span className="mt-1.5 inline-block truncate rounded-full bg-brand-light/50 px-2 py-0.5 text-[11px] font-bold text-brand-dark">
                              {line.variantLabel}
                            </span>
                          )}
                          <p className="mt-1.5 truncate text-xs text-muted">
                            Người bán: <span className="font-semibold text-foreground/80">{line.seller}</span>
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-base font-black text-danger sm:text-lg">
                            {formatVnd(line.price)}
                          </p>

                          <div className="flex shrink-0 items-center gap-2">
                            <div className="flex items-center overflow-hidden rounded-full border border-border-c">
                              <button
                                onClick={() =>
                                  setQuantity(line.productId, line.variantId, line.quantity - 1)
                                }
                                className="grid h-8 w-8 place-items-center text-muted transition hover:bg-brand hover:text-ink"
                                aria-label="Giảm số lượng"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-8 text-center text-sm font-bold tabular-nums text-foreground">
                                {line.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  setQuantity(
                                    line.productId,
                                    line.variantId,
                                    Math.min(line.stock, line.quantity + 1)
                                  )
                                }
                                className="grid h-8 w-8 place-items-center text-muted transition hover:bg-brand hover:text-ink"
                                aria-label="Tăng số lượng"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <button
                              onClick={() => removeItem(line.productId, line.variantId)}
                              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-danger/10 hover:text-danger"
                              aria-label="Xoá khỏi giỏ hàng"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>

              <Reveal delay={0.05}>
                <div className="flex flex-col gap-4 rounded-2xl border-2 border-brand/40 bg-surface p-5 shadow-sm lg:sticky lg:top-24">
                  <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-foreground">
                    <Tag className="h-4 w-4 text-brand-dark" />
                    Tóm tắt đơn hàng
                  </h2>

                  <div className="flex justify-between text-sm text-muted">
                    <span>Tạm tính</span>
                    <span className="font-semibold text-foreground">{formatVnd(subtotal)}</span>
                  </div>

                  <div>
                    {appliedDiscount ? (
                      <div className="flex items-center justify-between gap-2 rounded-xl bg-success/10 px-3 py-2.5 text-xs font-semibold text-success">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            Mã {appliedDiscount.code} (-{formatVnd(appliedDiscount.amount)})
                          </span>
                        </span>
                        <button
                          onClick={() => {
                            setAppliedDiscount(null);
                            setDiscountInput("");
                          }}
                          className="shrink-0 rounded-full p-0.5 transition hover:bg-success/20"
                          aria-label="Bỏ mã giảm giá"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 rounded-xl bg-surface-alt p-1.5">
                        <input
                          type="text"
                          value={discountInput}
                          onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                          placeholder="Mã giảm giá"
                          className="min-w-0 flex-1 rounded-lg border-0 bg-transparent px-2.5 py-1.5 text-sm uppercase text-foreground placeholder:normal-case focus:outline-none"
                        />
                        <button
                          onClick={handleApplyDiscount}
                          disabled={applyingDiscount || !discountInput.trim()}
                          className="shrink-0 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-black text-ink transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {applyingDiscount ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Áp dụng"
                          )}
                        </button>
                      </div>
                    )}
                    {discountError && (
                      <p className="mt-1.5 text-xs font-semibold text-danger">{discountError}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t-2 border-dashed border-border-c pt-4">
                    <span className="text-sm font-bold text-foreground">Tổng cộng</span>
                    <span className="text-2xl font-black text-danger">{formatVnd(total)}</span>
                  </div>

                  {error && (
                    <p className="rounded-xl bg-danger/10 px-3 py-2.5 text-xs font-semibold text-danger">
                      {error}
                    </p>
                  )}

                  {session ? (
                    <>
                      <p className="flex items-center gap-1.5 text-xs text-muted">
                        <Wallet className="h-3.5 w-3.5 text-brand-dark" />
                        Số dư ví: <span className="font-bold text-foreground">{formatVnd(session.user.walletBalance)}</span>
                      </p>
                      <button
                        onClick={handleCheckout}
                        disabled={checkingOut}
                        className="flex items-center justify-center gap-1.5 rounded-full bg-brand py-3.5 text-center text-sm font-black text-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                      >
                        {checkingOut ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Đang xử lý...
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="h-4 w-4" /> Thanh toán qua ví
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/dang-nhap?callbackUrl=/gio-hang"
                      className="flex items-center justify-center gap-1.5 rounded-full bg-brand py-3.5 text-center text-sm font-black text-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md"
                    >
                      Đăng nhập để thanh toán
                    </Link>
                  )}

                  <p className="flex items-center gap-1.5 border-t border-border-c pt-3.5 text-xs text-muted">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-success" />
                    Giao dịch ký quỹ an toàn, giao hàng tự động
                  </p>
                </div>
              </Reveal>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
