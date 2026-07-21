"use client";

import { Loader2, Minus, Package, Plus, ShieldCheck, Tag, Trash2, X } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Breadcrumb from "@/components/Breadcrumb";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
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
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Giỏ hàng" }]} />
        </div>

        <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
          <Reveal>
            <h1 className="mb-4 text-xl font-black text-foreground">
              Giỏ hàng ({lines.length})
            </h1>
          </Reveal>

          {lines.length === 0 ? (
            <Reveal>
              <div className="rounded-xl border border-dashed border-border-c bg-surface p-12 text-center text-sm text-muted">
                Giỏ hàng của bạn đang trống.{" "}
                <Link href="/" className="font-semibold text-brand-dark">
                  Tiếp tục mua sắm
                </Link>
              </div>
            </Reveal>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <Reveal>
                <div className="flex flex-col gap-3">
                  {lines.map((line) => (
                    <div
                      key={`${line.productId}:${line.variantId ?? ""}`}
                      className="flex items-center gap-3 rounded-xl border border-border-c bg-surface p-3 shadow-sm"
                    >
                      <Link
                        href={`/san-pham/${line.slug}`}
                        className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-surface-alt ring-1 ring-border-c"
                      >
                        <Package className="h-7 w-7 text-foreground/70" strokeWidth={1.5} />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/san-pham/${line.slug}`}
                          className="truncate text-sm font-bold text-foreground hover:text-brand-dark"
                        >
                          {line.name}
                        </Link>
                        {line.variantLabel && (
                          <p className="truncate text-xs font-semibold text-brand-dark">
                            {line.variantLabel}
                          </p>
                        )}
                        <p className="text-xs text-muted">
                          Người bán: {line.seller}
                        </p>
                        <p className="mt-1 text-sm font-black text-danger">
                          {formatVnd(line.price)}
                        </p>
                      </div>
                      <div className="flex items-center rounded-lg border border-border-c">
                        <button
                          onClick={() =>
                            setQuantity(line.productId, line.variantId, line.quantity - 1)
                          }
                          className="p-2 text-muted hover:text-foreground"
                          aria-label="Giảm số lượng"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold">
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
                          className="p-2 text-muted hover:text-foreground"
                          aria-label="Tăng số lượng"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(line.productId, line.variantId)}
                        className="p-2 text-muted hover:text-danger"
                        aria-label="Xoá khỏi giỏ hàng"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </Reveal>

              <Reveal delay={0.05}>
                <div className="flex flex-col gap-4 rounded-xl border border-border-c bg-surface p-5 shadow-sm">
                  <h2 className="text-sm font-bold text-foreground">Tóm tắt đơn hàng</h2>
                  <div className="flex justify-between text-sm text-muted">
                    <span>Tạm tính</span>
                    <span>{formatVnd(subtotal)}</span>
                  </div>

                  <div>
                    {appliedDiscount ? (
                      <div className="flex items-center justify-between rounded-lg bg-success/10 px-3 py-2 text-xs font-semibold text-success">
                        <span className="flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5" />
                          Mã {appliedDiscount.code} (-{formatVnd(appliedDiscount.amount)})
                        </span>
                        <button
                          onClick={() => {
                            setAppliedDiscount(null);
                            setDiscountInput("");
                          }}
                          aria-label="Bỏ mã giảm giá"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={discountInput}
                          onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                          placeholder="Mã giảm giá"
                          className="min-w-0 flex-1 rounded-lg border border-border-c px-3 py-2 text-sm uppercase focus:border-brand-dark focus:outline-none"
                        />
                        <button
                          onClick={handleApplyDiscount}
                          disabled={applyingDiscount || !discountInput.trim()}
                          className="shrink-0 rounded-lg bg-surface-alt px-3 py-2 text-xs font-bold text-foreground transition hover:bg-border-c disabled:opacity-50"
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

                  <div className="flex justify-between border-t border-border-c pt-3 text-base font-black text-foreground">
                    <span>Tổng cộng</span>
                    <span className="text-danger">{formatVnd(total)}</span>
                  </div>

                  {error && (
                    <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
                      {error}
                    </p>
                  )}

                  {session ? (
                    <>
                      <p className="text-xs text-muted">
                        Số dư ví: {formatVnd(session.user.walletBalance)}
                      </p>
                      <button
                        onClick={handleCheckout}
                        disabled={checkingOut}
                        className="rounded-full bg-brand py-3 text-center text-sm font-black text-ink transition hover:bg-brand-dark disabled:opacity-60"
                      >
                        {checkingOut ? "Đang xử lý..." : "Thanh toán qua ví"}
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/dang-nhap?callbackUrl=/gio-hang"
                      className="rounded-full bg-brand py-3 text-center text-sm font-black text-ink transition hover:bg-brand-dark"
                    >
                      Đăng nhập để thanh toán
                    </Link>
                  )}

                  <p className="flex items-center gap-1.5 text-xs text-muted">
                    <ShieldCheck className="h-3.5 w-3.5 text-success" />
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
