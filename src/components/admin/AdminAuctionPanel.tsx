"use client";

import { Ban, Save, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminBadge, AdminButton } from "@/components/admin/AdminUi";
import AdminAuctionResolveButton from "@/components/admin/AdminAuctionResolveButton";
import { formatVnd } from "@/lib/format";

type Bid = {
  id: string;
  amount: number;
  createdAt: string;
  sellerName: string;
  sellerSlug: string;
  productName: string;
  productSlug: string;
};

type Slot = {
  id: string;
  position: number;
  period: "DAILY" | "WEEKLY";
  floorPrice: number;
  startAt: string;
  endAt: string;
  status: "OPEN" | "CLOSED";
  bids: Bid[];
};

type SellerOption = { id: string; shopName: string };
type ProductOption = { id: string; name: string };

export default function AdminAuctionPanel() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/auction/slots");
    if (res.ok) {
      const data = await res.json();
      setSlots(data.slots);
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const openSlots = slots.filter((s) => s.status === "OPEN");
  const weekly = openSlots.filter((s) => s.period === "WEEKLY").sort((a, b) => a.position - b.position);
  const daily = openSlots.filter((s) => s.period === "DAILY").sort((a, b) => a.position - b.position);
  const totalBids = openSlots.reduce((sum, s) => sum + s.bids.length, 0);
  const active = slots.find((s) => s.id === activeId) ?? null;

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MiniStat label="Vị trí đang mở" value={`${openSlots.length}`} />
        <MiniStat label="Tổng lượt đặt giá" value={`${totalBids}`} />
        <MiniStat label="Vị trí Tuần" value="#1 – #4" />
        <MiniStat label="Vị trí Ngày" value="#5 – #6" />
      </div>

      <div className="mb-5">
        <AdminAuctionResolveButton onDone={load} />
      </div>

      <div className="mb-6">
        <h2 className="mb-3 text-sm font-black text-[var(--adm-text)]">Vị trí Tuần (#1 – #4)</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {weekly.map((s) => (
            <SlotCard key={s.id} slot={s} onClick={() => setActiveId(s.id)} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-black text-[var(--adm-text)]">Vị trí Ngày (#5 – #6)</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {daily.map((s) => (
            <SlotCard key={s.id} slot={s} onClick={() => setActiveId(s.id)} />
          ))}
        </div>
      </div>

      {!loading && openSlots.length === 0 && (
        <p className="mt-4 text-center text-sm text-[var(--adm-muted)]">Không có vị trí nào đang mở.</p>
      )}

      {active && (
        <SlotModal
          slot={active}
          onClose={() => setActiveId(null)}
          onChanged={() => {
            load();
          }}
        />
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-4">
      <p className="text-[11px] font-semibold text-[var(--adm-muted)]">{label}</p>
      <p className="mt-0.5 text-lg font-black text-[var(--adm-text)]">{value}</p>
    </div>
  );
}

function SlotCard({ slot, onClick }: { slot: Slot; onClick: () => void }) {
  const top = slot.bids[0];
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-2 rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-4 text-left shadow-sm transition hover:border-[var(--adm-brand)]"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-[var(--adm-brand)]">Vị trí #{slot.position}</span>
        <AdminBadge variant="neutral">{slot.bids.length} bid</AdminBadge>
      </div>
      {top ? (
        <div>
          <p className="truncate text-xs font-bold text-[var(--adm-text)]">{top.productName}</p>
          <p className="truncate text-[11px] text-[var(--adm-muted)]">{top.sellerName}</p>
          <p className="mt-1 text-sm font-black text-[var(--adm-success)]">{formatVnd(top.amount)}</p>
        </div>
      ) : (
        <p className="text-xs text-[var(--adm-muted)]">Chưa có lượt đặt giá</p>
      )}
      <p className="text-[10.5px] text-[var(--adm-muted)]">
        Giá sàn {formatVnd(slot.floorPrice)} · Hết hạn {new Date(slot.endAt).toLocaleString("vi-VN")}
      </p>
    </button>
  );
}

function SlotModal({ slot, onClose, onChanged }: { slot: Slot; onClose: () => void; onChanged: () => void }) {
  const [floorPrice, setFloorPrice] = useState(slot.floorPrice);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [sellers, setSellers] = useState<SellerOption[]>([]);
  const [sellerId, setSellerId] = useState("");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productId, setProductId] = useState("");
  const [chargeSeller, setChargeSeller] = useState(false);
  const [amount, setAmount] = useState(slot.floorPrice);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/sellers");
      if (res.ok) {
        const data = await res.json();
        setSellers(data.sellers.map((s: { id: string; shopName: string }) => ({ id: s.id, shopName: s.shopName })));
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setProductId("");
      setProducts([]);
      if (!sellerId) return;
      const res = await fetch(`/api/admin/sellers/${sellerId}/products`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
      }
    })();
  }, [sellerId]);

  const saveFloorPrice = async () => {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/auction/slots/${slot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ floorPrice }),
    });
    const data = await res.json();
    setBusy(false);
    setMsg(res.ok ? "Đã cập nhật giá sàn." : (data.error ?? "Cập nhật thất bại."));
    if (res.ok) onChanged();
  };

  const closeNow = async () => {
    if (!confirm(`Đóng phiên #${slot.position} ngay bây giờ?`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/auction/slots/${slot.id}/close-now`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    setMsg(res.ok ? (data.won ? "Đã đóng phiên — có người thắng." : "Đã đóng phiên — không có người thắng đủ điều kiện.") : (data.error ?? "Thất bại."));
    if (res.ok) {
      onChanged();
      onClose();
    }
  };

  const cancelBids = async () => {
    if (!confirm(`Huỷ toàn bộ ${slot.bids.length} lượt đặt giá của vị trí #${slot.position}?`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/auction/slots/${slot.id}/cancel-bids`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    setMsg(res.ok ? `Đã huỷ ${data.cancelled} lượt đặt giá.` : (data.error ?? "Thất bại."));
    if (res.ok) onChanged();
  };

  const submitAssign = async () => {
    if (!productId) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/auction/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId: slot.id, productId, chargeSeller, amount: chargeSeller ? amount : undefined }),
    });
    const data = await res.json();
    setBusy(false);
    setMsg(res.ok ? "Đã gán thủ công thành công." : (data.error ?? "Gán thất bại."));
    if (res.ok) {
      onChanged();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-[var(--adm-text)]">
              Vị trí #{slot.position} — {slot.period === "WEEKLY" ? "Tuần" : "Ngày"}
            </h3>
            <p className="mt-0.5 text-xs text-[var(--adm-muted)]">
              {slot.status === "OPEN" ? "Đang mở" : "Đã đóng"} · Hết hạn {new Date(slot.endAt).toLocaleString("vi-VN")}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-[var(--adm-muted)] hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        {msg && (
          <p className="mb-3 rounded-lg bg-[var(--adm-surface-2)] px-3 py-2 text-xs font-semibold text-[var(--adm-text)]">
            {msg}
          </p>
        )}

        <div className="flex flex-col gap-5">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--adm-muted)]">Lịch sử đặt giá</p>
            {slot.bids.length === 0 ? (
              <p className="text-xs text-[var(--adm-muted)]">Chưa có lượt đặt giá nào.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {slot.bids.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-[var(--adm-surface-2)] px-3 py-2 text-xs"
                  >
                    <span className="truncate text-[var(--adm-text)]">
                      {b.sellerName} — {b.productName}
                    </span>
                    <span className="shrink-0 font-bold text-[var(--adm-brand)]">{formatVnd(b.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {slot.status === "OPEN" && (
            <>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--adm-muted)]">Giá sàn</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={floorPrice}
                    onChange={(e) => setFloorPrice(Number(e.target.value))}
                    className="w-40 rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-3 py-1.5 text-sm text-[var(--adm-text)] outline-none"
                  />
                  <AdminButton variant="neutral" disabled={busy} onClick={saveFloorPrice}>
                    <Save className="h-3.5 w-3.5" /> Lưu
                  </AdminButton>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--adm-muted)]">
                  Gán thủ công
                </p>
                <div className="flex flex-col gap-2">
                  <select
                    value={sellerId}
                    onChange={(e) => setSellerId(e.target.value)}
                    className="rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-3 py-1.5 text-sm text-[var(--adm-text)] outline-none"
                  >
                    <option value="">Chọn gian hàng...</option>
                    {sellers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.shopName}
                      </option>
                    ))}
                  </select>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    disabled={!sellerId}
                    className="rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-3 py-1.5 text-sm text-[var(--adm-text)] outline-none disabled:opacity-50"
                  >
                    <option value="">
                      {sellerId ? "Chọn sản phẩm..." : "Chọn gian hàng trước"}
                    </option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-xs text-[var(--adm-text)]">
                    <input
                      type="checkbox"
                      checked={chargeSeller}
                      onChange={(e) => setChargeSeller(e.target.checked)}
                    />
                    Thu phí seller
                  </label>
                  {chargeSeller && (
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      placeholder="Số tiền thu (đ)"
                      className="rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-3 py-1.5 text-sm text-[var(--adm-text)] outline-none"
                    />
                  )}
                  <AdminButton variant="brand" disabled={busy || !productId} onClick={submitAssign}>
                    <Sparkles className="h-3.5 w-3.5" /> Gán vào vị trí này
                  </AdminButton>
                </div>
              </div>

              <div className="flex gap-2 border-t border-[var(--adm-border)] pt-4">
                <AdminButton variant="neutral" disabled={busy} onClick={closeNow}>
                  Đóng phiên ngay
                </AdminButton>
                {slot.bids.length > 0 && (
                  <AdminButton variant="danger" disabled={busy} onClick={cancelBids}>
                    <Ban className="h-3.5 w-3.5" /> Huỷ mọi lượt đặt giá
                  </AdminButton>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
