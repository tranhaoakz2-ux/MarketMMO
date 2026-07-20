"use client";

import { BadgeCheck, ExternalLink, Lock, Search, Unlock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminBadge, AdminButton, AdminEmptyState } from "@/components/admin/AdminUi";
import { formatVnd } from "@/lib/format";

type AdminSeller = {
  id: string;
  shopName: string;
  slug: string;
  level: number;
  verified: boolean;
  suspended: boolean;
  suspendedReason: string | null;
  insuranceBalance: number;
  productCount: number;
  createdAt: string;
  user: { email: string | null; walletBalance: number };
};

export default function AdminSellersPanel() {
  const [sellers, setSellers] = useState<AdminSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminSeller | null>(null);
  const [reason, setReason] = useState("");

  const load = async (query: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/sellers${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    if (res.ok) {
      const data = await res.json();
      setSellers(data.sellers);
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await load("");
    })();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await load(q);
  };

  const handleUnsuspend = async (id: string) => {
    setBusyId(id);
    await fetch(`/api/admin/sellers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unsuspend" }),
    });
    setBusyId(null);
    load(q);
  };

  const confirmSuspend = async () => {
    if (!suspendTarget) return;
    setBusyId(suspendTarget.id);
    await fetch(`/api/admin/sellers/${suspendTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "suspend", reason: reason || undefined }),
    });
    setBusyId(null);
    setSuspendTarget(null);
    setReason("");
    load(q);
  };

  const handleToggleVerified = async (seller: AdminSeller) => {
    setBusyId(seller.id);
    await fetch(`/api/admin/sellers/${seller.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: seller.verified ? "unverify" : "verify" }),
    });
    setBusyId(null);
    load(q);
  };

  return (
    <div>
      <form onSubmit={handleSearch} className="mb-4 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-full border border-[var(--adm-border)] bg-[var(--adm-surface)] px-3.5 py-2">
          <Search className="h-4 w-4 text-[var(--adm-muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên gian hàng..."
            className="w-full bg-transparent text-sm text-[var(--adm-text)] outline-none placeholder:text-[var(--adm-muted)]"
          />
        </div>
        <AdminButton type="submit" variant="brand">
          Tìm
        </AdminButton>
      </form>

      {loading ? (
        <p className="text-sm text-[var(--adm-muted)]">Đang tải...</p>
      ) : sellers.length === 0 ? (
        <AdminEmptyState>Không tìm thấy gian hàng nào.</AdminEmptyState>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)]">
          <div className="grid grid-cols-[1fr_70px_100px_110px_90px_130px_140px] gap-2 border-b border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-4 py-2.5 text-xs font-bold text-[var(--adm-muted)]">
            <span>Gian hàng</span>
            <span>Sản phẩm</span>
            <span>Số dư ví</span>
            <span>Quỹ bảo hiểm</span>
            <span>Trạng thái</span>
            <span>Xác thực</span>
            <span>Hành động</span>
          </div>
          {sellers.map((s) => (
            <div
              key={s.id}
              className="grid grid-cols-[1fr_70px_100px_110px_90px_130px_140px] items-center gap-2 border-b border-[var(--adm-border)] px-4 py-3 text-sm last:border-0"
            >
              <div className="min-w-0">
                <Link
                  href={`/shop/${s.slug}`}
                  target="_blank"
                  className="flex items-center gap-1 truncate font-bold text-[var(--adm-text)] hover:text-[var(--adm-brand)]"
                >
                  <span className="truncate">{s.shopName}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </Link>
                <p className="truncate text-xs text-[var(--adm-muted)]">
                  {s.user.email} · LV {s.level} {s.verified && <BadgeCheck className="inline h-3 w-3 text-[var(--adm-success)]" />}
                </p>
              </div>
              <span className="text-[var(--adm-text)]">{s.productCount}</span>
              <span className="font-bold text-[var(--adm-text)]">{formatVnd(s.user.walletBalance)}</span>
              <span className="text-[var(--adm-text)]">{formatVnd(s.insuranceBalance)}</span>
              {s.suspended ? (
                <AdminBadge variant="danger">Đã khoá</AdminBadge>
              ) : (
                <AdminBadge variant="success">Hoạt động</AdminBadge>
              )}
              <AdminButton
                variant={s.verified ? "success" : "neutral"}
                disabled={busyId === s.id}
                onClick={() => handleToggleVerified(s)}
              >
                <BadgeCheck className="h-3.5 w-3.5" /> {s.verified ? "Đã xác thực" : "Đánh dấu"}
              </AdminButton>
              {s.suspended ? (
                <AdminButton variant="success" disabled={busyId === s.id} onClick={() => handleUnsuspend(s.id)}>
                  <Unlock className="h-3.5 w-3.5" /> Mở khoá
                </AdminButton>
              ) : (
                <AdminButton variant="danger" disabled={busyId === s.id} onClick={() => setSuspendTarget(s)}>
                  <Lock className="h-3.5 w-3.5" /> Khoá
                </AdminButton>
              )}
            </div>
          ))}
        </div>
      )}

      {suspendTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSuspendTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-6 shadow-2xl"
          >
            <h3 className="text-base font-black text-[var(--adm-text)]">Khoá gian hàng {suspendTarget.shopName}?</h3>
            <p className="mt-1 text-xs text-[var(--adm-muted)]">
              Toàn bộ sản phẩm của gian hàng này sẽ biến mất khỏi site công khai (trang chủ, danh mục, tìm kiếm).
              Seller vẫn đăng nhập được bình thường.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Lý do khoá (tuỳ chọn)..."
              rows={3}
              className="mt-3 w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-3 py-2 text-sm text-[var(--adm-text)] outline-none placeholder:text-[var(--adm-muted)]"
            />
            <div className="mt-4 flex gap-2">
              <AdminButton variant="danger" disabled={busyId === suspendTarget.id} onClick={confirmSuspend}>
                <Lock className="h-3.5 w-3.5" /> Xác nhận khoá
              </AdminButton>
              <AdminButton variant="neutral" onClick={() => setSuspendTarget(null)}>
                Huỷ
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
