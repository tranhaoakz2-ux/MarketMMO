"use client";

import { Check, ExternalLink, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminButton, AdminCard, AdminEmptyState } from "@/components/admin/AdminUi";

type Verification = {
  id: string;
  fullName: string;
  idNumber: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  seller: { shopName: string; slug: string };
};

export default function AdminVerificationsPanel() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/verifications");
    if (res.ok) {
      const data = await res.json();
      setVerifications(data.verifications);
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    await fetch(`/api/admin/verifications/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyId(null);
    load();
  };

  const pending = verifications.filter((v) => v.status === "PENDING");

  return (
    <div>
      <h2 className="mb-3 text-sm font-black text-[var(--adm-text)]">
        Yêu cầu xác thực CCCD chờ duyệt ({pending.length})
      </h2>
      {loading ? (
        <p className="text-sm text-[var(--adm-muted)]">Đang tải...</p>
      ) : pending.length === 0 ? (
        <AdminEmptyState>Không có yêu cầu xác thực nào đang chờ duyệt.</AdminEmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {pending.map((v) => (
            <AdminCard key={v.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[var(--adm-text)]">{v.seller.shopName}</p>
                  <p className="text-xs text-[var(--adm-muted)]">
                    {v.fullName} · {v.idNumber} · {new Date(v.createdAt).toLocaleString("vi-VN")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`/api/admin/verifications/${v.id}/image/front`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-full border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--adm-text)] hover:bg-white/10"
                  >
                    Mặt trước <ExternalLink className="h-3 w-3" />
                  </a>
                  <a
                    href={`/api/admin/verifications/${v.id}/image/back`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-full border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--adm-text)] hover:bg-white/10"
                  >
                    Mặt sau <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <AdminButton variant="success" disabled={busyId === v.id} onClick={() => handleAction(v.id, "approve")}>
                  <Check className="h-3.5 w-3.5" /> Duyệt
                </AdminButton>
                <AdminButton variant="danger" disabled={busyId === v.id} onClick={() => handleAction(v.id, "reject")}>
                  <X className="h-3.5 w-3.5" /> Từ chối
                </AdminButton>
              </div>
            </AdminCard>
          ))}
        </div>
      )}
    </div>
  );
}
