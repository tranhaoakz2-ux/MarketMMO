"use client";

// Panel THẬT "Danh mục mới" — giao diện đồng bộ với bản demo đã duyệt
// (AdminDemoCategories.tsx), dùng chung AdminDemoKit. TOÀN BỘ dữ liệu/hành
// vi vẫn THẬT: fetch GET /api/admin/categories, POST
// /api/admin/categories/[id] {action:"approve"|"reject"} — không đổi 1 dòng
// logic nghiệp vụ. API route đã có sẵn requireAdmin() (không đụng tới).
import { Check, Tags, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, EmptyState, ListSkeleton } from "@/components/admin-demo/AdminDemoKit";

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
    <div className="flex flex-col gap-4">
      <p className="text-xs font-bold text-[var(--adm-muted)]">
        {loading ? "Đang tải..." : `${pending.length} danh mục đang chờ duyệt`}
      </p>

      {loading ? (
        <ListSkeleton rows={2} />
      ) : pending.length === 0 ? (
        <Card>
          <EmptyState icon={Tags} title="Không có danh mục nào đang chờ duyệt">
            Mọi đề xuất danh mục đã được xử lý hết. 🎉
          </EmptyState>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((c) => (
            <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[var(--adm-text)]">{c.name}</p>
                <p className="text-xs text-[var(--adm-muted)]">Đề xuất bởi: {c.proposedBy?.shopName ?? "—"}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="success" disabled={busyId === c.id} onClick={() => handleAction(c.id, "approve")}>
                  <Check className="h-3.5 w-3.5" /> Duyệt
                </Button>
                <Button variant="danger" disabled={busyId === c.id} onClick={() => handleAction(c.id, "reject")}>
                  <X className="h-3.5 w-3.5" /> Từ chối
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
