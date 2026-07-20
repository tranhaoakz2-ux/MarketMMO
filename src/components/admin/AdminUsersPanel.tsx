"use client";

import { Lock, Search, Unlock } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminBadge, AdminButton, AdminEmptyState } from "@/components/admin/AdminUi";
import { formatVnd } from "@/lib/format";
import { roleLabel, type Role } from "@/lib/constants";

type AdminUser = {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  role: Role;
  walletBalance: number;
  banned: boolean;
  bannedReason: string | null;
  bannedAt: string | null;
  createdAt: string;
};

export default function AdminUsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState("");

  const load = async (query: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/users${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
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

  const handleUnban = async (id: string) => {
    setBusyId(id);
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unban" }),
    });
    setBusyId(null);
    load(q);
  };

  const confirmBan = async () => {
    if (!banTarget) return;
    setBusyId(banTarget.id);
    await fetch(`/api/admin/users/${banTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ban", reason: banReason || undefined }),
    });
    setBusyId(null);
    setBanTarget(null);
    setBanReason("");
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
            placeholder="Tìm theo email, username hoặc tên..."
            className="w-full bg-transparent text-sm text-[var(--adm-text)] outline-none placeholder:text-[var(--adm-muted)]"
          />
        </div>
        <AdminButton type="submit" variant="brand">
          Tìm
        </AdminButton>
      </form>

      {loading ? (
        <p className="text-sm text-[var(--adm-muted)]">Đang tải...</p>
      ) : users.length === 0 ? (
        <AdminEmptyState>Không tìm thấy người dùng nào.</AdminEmptyState>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)]">
          <div className="grid grid-cols-[1fr_110px_120px_100px_140px] gap-2 border-b border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-4 py-2.5 text-xs font-bold text-[var(--adm-muted)]">
            <span>Người dùng</span>
            <span>Vai trò</span>
            <span>Số dư ví</span>
            <span>Trạng thái</span>
            <span>Hành động</span>
          </div>
          {users.map((u) => (
            <div
              key={u.id}
              className="grid grid-cols-[1fr_110px_120px_100px_140px] items-center gap-2 border-b border-[var(--adm-border)] px-4 py-3 text-sm last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate font-bold text-[var(--adm-text)]">
                  {u.name ?? u.username ?? "—"}
                </p>
                <p className="truncate text-xs text-[var(--adm-muted)]">{u.email ?? u.username}</p>
              </div>
              <span className="text-xs text-[var(--adm-muted)]">{roleLabel[u.role]}</span>
              <span className="font-bold text-[var(--adm-text)]">{formatVnd(u.walletBalance)}</span>
              {u.banned ? (
                <AdminBadge variant="danger">Đã khoá</AdminBadge>
              ) : (
                <AdminBadge variant="success">Hoạt động</AdminBadge>
              )}
              {u.role === "ADMIN" ? (
                <span className="text-xs text-[var(--adm-muted)]">—</span>
              ) : u.banned ? (
                <AdminButton variant="success" disabled={busyId === u.id} onClick={() => handleUnban(u.id)}>
                  <Unlock className="h-3.5 w-3.5" /> Mở khoá
                </AdminButton>
              ) : (
                <AdminButton variant="danger" disabled={busyId === u.id} onClick={() => setBanTarget(u)}>
                  <Lock className="h-3.5 w-3.5" /> Khoá
                </AdminButton>
              )}
            </div>
          ))}
        </div>
      )}

      {banTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setBanTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-6 shadow-2xl"
          >
            <h3 className="text-base font-black text-[var(--adm-text)]">
              Khoá tài khoản {banTarget.name ?? banTarget.username ?? banTarget.email}?
            </h3>
            <p className="mt-1 text-xs text-[var(--adm-muted)]">
              Tài khoản sẽ không thể đăng nhập, mua hàng, hoặc thực hiện bất kỳ thao tác nào cho tới khi được mở khoá.
            </p>
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Lý do khoá (tuỳ chọn)..."
              rows={3}
              className="mt-3 w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-3 py-2 text-sm text-[var(--adm-text)] outline-none placeholder:text-[var(--adm-muted)]"
            />
            <div className="mt-4 flex gap-2">
              <AdminButton variant="danger" disabled={busyId === banTarget.id} onClick={confirmBan}>
                <Lock className="h-3.5 w-3.5" /> Xác nhận khoá
              </AdminButton>
              <AdminButton variant="neutral" onClick={() => setBanTarget(null)}>
                Huỷ
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
