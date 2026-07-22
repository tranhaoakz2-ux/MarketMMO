"use client";

import { LogIn, Store } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatVnd } from "@/lib/format";

type MyProduct = { id: string; name: string; slug: string };

export default function AuctionBidForm({
  slotId,
  minAmount,
  myProducts,
  isSeller,
}: {
  slotId: string;
  minAmount: number;
  myProducts: MyProduct[];
  isSeller: boolean;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [productId, setProductId] = useState(myProducts[0]?.id ?? "");
  const [amount, setAmount] = useState(minAmount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (status === "loading") return null;

  if (!session) {
    return (
      <Link
        href="/dang-nhap?callbackUrl=/dau-gia"
        className="flex items-center justify-center gap-1.5 rounded-full border-2 border-ink px-4 py-2 text-xs font-bold text-foreground transition hover:bg-ink hover:text-white dark:border-border-c"
      >
        <LogIn className="h-3.5 w-3.5" /> Đăng nhập để đấu giá
      </Link>
    );
  }

  if (!isSeller) {
    return (
      <Link
        href="/tro-thanh-nguoi-ban"
        className="flex items-center justify-center gap-1.5 rounded-full border-2 border-ink px-4 py-2 text-xs font-bold text-foreground transition hover:bg-ink hover:text-white dark:border-border-c"
      >
        <Store className="h-3.5 w-3.5" /> Cần có gian hàng để đấu giá
      </Link>
    );
  }

  if (myProducts.length === 0) {
    return (
      <p className="text-xs text-muted">
        Gian hàng của bạn chưa có sản phẩm nào để đấu giá quảng bá.
      </p>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (amount < minAmount) {
      setError(`Giá đấu phải từ ${formatVnd(minAmount)} trở lên.`);
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auction/bids", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, productId, amount }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Đặt giá đấu thất bại.");
      return;
    }
    setSuccess(true);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <select
        value={productId}
        onChange={(e) => setProductId(e.target.value)}
        className="rounded-lg border border-border-c px-2.5 py-2 text-xs bg-surface text-foreground focus:border-brand-dark focus:outline-none"
      >
        {myProducts.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <input
          type="number"
          min={minAmount}
          step={1000}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
          className="w-full rounded-lg border border-border-c px-2.5 py-2 text-xs bg-surface text-foreground focus:border-brand-dark focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-lg bg-ink px-3 py-2 text-xs font-bold text-white transition hover:bg-ink-soft disabled:opacity-60"
        >
          {loading ? "..." : "Đặt giá"}
        </button>
      </div>
      {error && <p className="text-[11px] font-semibold text-danger">{error}</p>}
      {success && <p className="text-[11px] font-semibold text-success">Đặt giá thành công!</p>}
    </form>
  );
}
