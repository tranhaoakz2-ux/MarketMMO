"use client";

// Panel THẬT "Diễn đàn" — giao diện đồng bộ với bản demo đã duyệt
// (AdminDemoForum.tsx), dùng chung AdminDemoKit. TOÀN BỘ dữ liệu/hành vi vẫn
// THẬT: fetch GET /api/admin/forum-reports, POST
// /api/admin/forum-reports/[id] {action:"hide"|"dismiss"} — không đổi 1
// dòng logic nghiệp vụ. API route đã có sẵn requireAdmin() (không đụng tới).
import { Eye, EyeOff, MessageSquareWarning } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, EmptyState, ListSkeleton } from "@/components/admin-demo/AdminDemoKit";

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
    <div className="flex flex-col gap-4">
      <p className="text-xs font-bold text-[var(--adm-muted)]">
        {loading ? "Đang tải..." : `${reports.length} báo cáo đang chờ xử lý`}
      </p>

      {loading ? (
        <ListSkeleton rows={3} />
      ) : reports.length === 0 ? (
        <Card>
          <EmptyState icon={MessageSquareWarning} title="Không có báo cáo nào đang chờ xử lý">
            Diễn đàn hiện không có nội dung nào bị báo cáo. 🎉
          </EmptyState>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((r) => (
            <Card key={r.id}>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--adm-brand)]">
                  {r.type === "POST" ? "Bài viết" : "Bình luận"} · {r.targetTitle}
                </p>
                <p className="mt-1.5 line-clamp-2 text-sm text-[var(--adm-text)]">{r.targetContent}</p>
                <p className="mt-2 text-xs text-[var(--adm-muted)]">
                  Báo cáo bởi {r.reporterName} · {new Date(r.createdAt).toLocaleString("vi-VN")}
                </p>
                <p className="mt-1.5 rounded-lg bg-[var(--adm-surface-2)] px-2.5 py-1.5 text-xs text-[var(--adm-text)]">
                  Lý do: {r.reason}
                </p>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="danger" disabled={busyId === r.id} onClick={() => handleAction(r.id, "hide")}>
                  <EyeOff className="h-3.5 w-3.5" /> Ẩn nội dung
                </Button>
                <Button variant="secondary" disabled={busyId === r.id} onClick={() => handleAction(r.id, "dismiss")}>
                  <Eye className="h-3.5 w-3.5" /> Bỏ qua (không vi phạm)
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
