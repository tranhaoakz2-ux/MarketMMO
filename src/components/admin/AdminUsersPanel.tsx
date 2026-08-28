"use client";

// Panel THẬT "Người dùng" — giao diện đồng bộ với bản demo đã duyệt
// (AdminDemoUsers.tsx), dùng chung AdminDemoKit. TOÀN BỘ dữ liệu/hành vi vẫn
// THẬT: fetch GET /api/admin/users?q=, PATCH /api/admin/users/[id]
// {action:"ban"|"unban", reason?} — không đổi 1 dòng logic nghiệp vụ, chỉ đổi
// phần trình bày (raw CSS grid → DataTable responsive, "Đang tải..." →
// skeleton). API route đã có sẵn requireAdmin() (không đụng tới).
import { Check, Copy, Lock, Unlock, Users as UsersIcon } from "lucide-react";
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
import { roleLabel, type Role } from "@/lib/constants";

type AdminUser = {
  id: string;
  memberCode: string | null;
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

// Nút sao chép mã thành viên — thuần UI, không đụng dữ liệu (cùng ý tưởng
// CopyOrderCodeButton.tsx nhưng dùng token --adm-* cho đúng theme tối admin).
function CopyMemberCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Sao chép mã thành viên"
      className={`grid h-5 w-5 shrink-0 place-items-center rounded transition ${
        copied ? "text-[var(--adm-success)]" : "text-[var(--adm-muted)] hover:bg-[var(--adm-surface-2)] hover:text-[var(--adm-brand)]"
      }`}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

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

  const columns: Column<AdminUser>[] = [
    {
      key: "memberCode",
      header: "ID",
      render: (u) =>
        u.memberCode ? (
          <div className="flex items-center gap-1">
            <span className="font-mono text-xs font-bold text-[var(--adm-text)]">{u.memberCode}</span>
            <CopyMemberCodeButton code={u.memberCode} />
          </div>
        ) : (
          <span className="text-xs text-[var(--adm-muted)]">—</span>
        ),
    },
    {
      key: "user",
      header: "Người dùng",
      primary: true,
      render: (u) => (
        <div className="min-w-0">
          <p className="max-w-[320px] truncate font-bold text-[var(--adm-text)]">{u.name ?? u.username ?? "—"}</p>
          <p className="max-w-[320px] truncate text-xs text-[var(--adm-muted)]">{u.email ?? u.username}</p>
        </div>
      ),
    },
    { key: "role", header: "Vai trò", render: (u) => <span className="text-xs text-[var(--adm-muted)]">{roleLabel[u.role]}</span> },
    {
      key: "wallet",
      header: "Số dư ví",
      align: "right",
      render: (u) => <span className="font-bold tabular-nums text-[var(--adm-text)]">{formatVndDemo(u.walletBalance)}</span>,
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (u) =>
        u.banned ? (
          <StatusBadge tone="danger" dot>Đã khoá</StatusBadge>
        ) : (
          <StatusBadge tone="success" dot>Hoạt động</StatusBadge>
        ),
    },
    {
      key: "actions",
      header: "Hành động",
      align: "right",
      render: (u) =>
        u.role === "ADMIN" ? (
          <span className="text-xs text-[var(--adm-muted)]">—</span>
        ) : u.banned ? (
          <Button size="sm" variant="success" disabled={busyId === u.id} onClick={() => handleUnban(u.id)}>
            <Unlock className="h-3.5 w-3.5" /> Mở khoá
          </Button>
        ) : (
          <Button size="sm" variant="danger" disabled={busyId === u.id} onClick={() => setBanTarget(u)}>
            <Lock className="h-3.5 w-3.5" /> Khoá
          </Button>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Tìm theo email, username, tên hoặc mã thành viên (MMO...)..." />
        <Button type="submit" variant="primary">Tìm</Button>
      </form>

      {loading ? (
        <TableSkeleton />
      ) : (
        <DataTable
          columns={columns}
          rows={users}
          rowKey={(u) => u.id}
          empty={<EmptyState icon={UsersIcon} title="Không tìm thấy người dùng nào">Thử từ khoá khác.</EmptyState>}
        />
      )}

      {banTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setBanTarget(null)}>
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
            <div className="mt-3">
              <Field label="Lý do khoá" hint="Tuỳ chọn">
                <Textarea
                  rows={3}
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Lý do khoá (tuỳ chọn)..."
                />
              </Field>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="danger" disabled={busyId === banTarget.id} onClick={confirmBan}>
                <Lock className="h-3.5 w-3.5" /> Xác nhận khoá
              </Button>
              <Button variant="secondary" onClick={() => setBanTarget(null)}>
                Huỷ
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
