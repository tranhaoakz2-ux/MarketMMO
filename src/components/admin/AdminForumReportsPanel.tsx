"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminButton, AdminCard, AdminEmptyState } from "@/components/admin/AdminUi";

type Report = {
  id: string;
  reason: string;
  createdAt: string;
  reporterName: string;
  type: "POST" | "COMMENT";
  targetTitle: string;
  targetContent: string;
  targetHidden: boolean;
  postId: string | null;
  commentId: string | null;
};

export default function AdminForumReportsPanel() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/forum-reports");
    if (res.ok) {
      const data = await res.json();
      setReports(data.reports);
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const handleAction = async (id: string, action: "hide" | "dismiss") => {
    setBusyId(id);
    await fetch(`/api/admin/forum-reports/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyId(null);
    load();
  };

  return (
    <div>
      <h2 className="mb-3 text-sm font-black text-[var(--adm-text)]">Báo cáo đang chờ xử lý ({reports.length})</h2>
      {loading ? (
        <p className="text-sm text-[var(--adm-muted)]">Đang tải...</p>
      ) : reports.length === 0 ? (
        <AdminEmptyState>Không có báo cáo nào đang chờ xử lý.</AdminEmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {reports.map((r) => (
            <AdminCard key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--adm-brand)]">
                    {r.type === "POST" ? "Bài viết" : "Bình luận"} · {r.targetTitle}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--adm-text)]">{r.targetContent}</p>
                  <p className="mt-2 text-xs text-[var(--adm-muted)]">
                    Báo cáo bởi {r.reporterName} · {new Date(r.createdAt).toLocaleString("vi-VN")}
                  </p>
                  <p className="mt-1 rounded-lg bg-[var(--adm-surface-2)] px-2.5 py-1.5 text-xs text-[var(--adm-text)]">
                    Lý do: {r.reason}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <AdminButton variant="danger" disabled={busyId === r.id} onClick={() => handleAction(r.id, "hide")}>
                  <EyeOff className="h-3.5 w-3.5" /> Ẩn nội dung
                </AdminButton>
                <AdminButton variant="neutral" disabled={busyId === r.id} onClick={() => handleAction(r.id, "dismiss")}>
                  <Eye className="h-3.5 w-3.5" /> Bỏ qua (không vi phạm)
                </AdminButton>
              </div>
            </AdminCard>
          ))}
        </div>
      )}
    </div>
  );
}
