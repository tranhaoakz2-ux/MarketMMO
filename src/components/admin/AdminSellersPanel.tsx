"use client";

// Panel THẬT "Người bán" — giao diện đồng bộ với bản demo đã duyệt
// (AdminDemoSellers.tsx), dùng chung AdminDemoKit. TOÀN BỘ dữ liệu/hành vi
// vẫn THẬT: fetch GET /api/admin/sellers?q=, PATCH /api/admin/sellers/[id]
// {action:"suspend"|"unsuspend"|"verify"|"unverify", reason?} — không đổi 1
// dòng logic nghiệp vụ. API route đã có sẵn requireAdmin() (không đụng tới).
import { BadgeCheck, ExternalLink, Lock, Store, Unlock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Button,
  type Column,
  DataTable,
  EmptyState,
  Field,
  SearchInput,
  StatusBadge,
  TableSkeleton,
  Textarea,
  formatVndDemo,
} from "@/components/admin-demo/AdminDemoKit";

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

  const columns: Column<AdminSeller>[] = [
    {
      key: "shop",
      header: "Gian hàng",
      primary: true,
      render: (s) => (
        <div className="min-w-0">
          <Link
            href={`/shop/${s.slug}`}
            target="_blank"
            className="flex max-w-[300px] items-center gap-1 truncate font-bold text-[var(--adm-text)] hover:text-[var(--adm-brand)]"
          >
            <span className="truncate">{s.shopName}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </Link>
          <p className="mt-0.5 flex max-w-[300px] items-center gap-1 truncate text-xs text-[var(--adm-muted)]">
            <span className="truncate">{s.user.email}</span> · LV {s.level}
            {s.verified && <BadgeCheck className="h-3 w-3 shrink-0 text-[var(--adm-success)]" />}
          </p>
        </div>
      ),
    },
    { key: "products", header: "Sản phẩm", align: "right", render: (s) => <span className="tabular-nums text-[var(--adm-text)]">{s.productCount}</span> },
    { key: "wallet", header: "Số dư ví", align: "right", render: (s) => <span className="font-bold tabular-nums text-[var(--adm-text)]">{formatVndDemo(s.user.walletBalance)}</span> },
    { key: "insurance", header: "Quỹ bảo hiểm", align: "right", render: (s) => <span className="tabular-nums text-[var(--adm-text)]">{formatVndDemo(s.insuranceBalance)}</span> },
    {
      key: "status",
      header: "Trạng thái",
      render: (s) => (s.suspended ? <StatusBadge tone="danger" dot>Đã khoá</StatusBadge> : <StatusBadge tone="success" dot>Hoạt động</StatusBadge>),
    },
    {
      key: "actions",
      header: "Hành động",
      align: "right",
      render: (s) => (
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button size="sm" variant={s.verified ? "success" : "secondary"} disabled={busyId === s.id} onClick={() => handleToggleVerified(s)}>
            <BadgeCheck className="h-3.5 w-3.5" /> {s.verified ? "Đã xác thực" : "Đánh dấu"}
          </Button>
          {s.suspended ? (
            <Button size="sm" variant="success" disabled={busyId === s.id} onClick={() => handleUnsuspend(s.id)}>
              <Unlock className="h-3.5 w-3.5" /> Mở khoá
            </Button>
          ) : (
            <Button size="sm" variant="danger" disabled={busyId === s.id} onClick={() => setSuspendTarget(s)}>
              <Lock className="h-3.5 w-3.5" /> Khoá
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Tìm theo tên gian hàng..." />
        <Button type="submit" variant="primary">Tìm</Button>
      </form>

      {loading ? (
        <TableSkeleton />
      ) : (
        <DataTable
          columns={columns}
          rows={sellers}
          rowKey={(s) => s.id}
          empty={<EmptyState icon={Store} title="Không tìm thấy gian hàng nào">Thử từ khoá khác.</EmptyState>}
        />
      )}

      {suspendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSuspendTarget(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-6 shadow-2xl"
          >
            <h3 className="text-base font-black text-[var(--adm-text)]">Khoá gian hàng {suspendTarget.shopName}?</h3>
            <p className="mt-1 text-xs text-[var(--adm-muted)]">
              Toàn bộ sản phẩm của gian hàng này sẽ biến mất khỏi site công khai (trang chủ, danh mục, tìm kiếm). Seller
              vẫn đăng nhập được bình thường.
            </p>
            <div className="mt-3">
              <Field label="Lý do khoá" hint="Tuỳ chọn">
                <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Lý do khoá (tuỳ chọn)..." />
              </Field>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="danger" disabled={busyId === suspendTarget.id} onClick={confirmSuspend}>
                <Lock className="h-3.5 w-3.5" /> Xác nhận khoá
              </Button>
              <Button variant="secondary" onClick={() => setSuspendTarget(null)}>
                Huỷ
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
