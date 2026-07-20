"use client";

import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminButton, AdminCard, AdminEmptyState } from "@/components/admin/AdminUi";

type PendingCategory = {
  id: string;
  name: string;
  emoji: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  proposedBy: { shopName: string; slug: string } | null;
};

export default function AdminCategoriesPanel() {
  const [categories, setCategories] = useState<PendingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/categories");
    if (res.ok) {
      const data = await res.json();
      setCategories(data.categories);
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
    await fetch(`/api/admin/categories/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyId(null);
    load();
  };

  const pending = categories.filter((c) => c.status === "PENDING");

  return (
    <div>
      <h2 className="mb-3 text-sm font-black text-[var(--adm-text)]">Danh mục mới chờ duyệt ({pending.length})</h2>
      {loading ? (
        <p className="text-sm text-[var(--adm-muted)]">Đang tải...</p>
      ) : pending.length === 0 ? (
        <AdminEmptyState>Không có danh mục nào đang chờ duyệt.</AdminEmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {pending.map((c) => (
            <AdminCard key={c.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[var(--adm-text)]">
                  {c.emoji} {c.name}
                </p>
                <p className="text-xs text-[var(--adm-muted)]">Đề xuất bởi: {c.proposedBy?.shopName ?? "—"}</p>
              </div>
              <div className="flex gap-2">
                <AdminButton variant="success" disabled={busyId === c.id} onClick={() => handleAction(c.id, "approve")}>
                  <Check className="h-3.5 w-3.5" /> Duyệt
                </AdminButton>
                <AdminButton variant="danger" disabled={busyId === c.id} onClick={() => handleAction(c.id, "reject")}>
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
