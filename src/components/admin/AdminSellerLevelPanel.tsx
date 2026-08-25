"use client";

// Panel THẬT "Hạng người bán" — sửa ngưỡng/quyền lợi 5 hạng + cấu hình chung
// (grace days chống nhấp nháy, trọng số khiếu nại 1 phần, cửa sổ tính tỉ lệ
// khiếu nại) qua GET/PATCH /api/admin/seller-levels/config, và nút "Tính lại
// toàn bộ" gọi POST /api/admin/seller-levels/recompute-all (chạy đúng hàm
// sweepAllSellerLevels() mà cron hàng ngày dùng). Khoá/ghi đè hạng 1 seller cụ
// thể nằm ở trang /admin/nguoi-ban (AdminSellersPanel.tsx), không lặp lại ở
// đây — trang này chỉ lo CẤU HÌNH áp dụng chung.
import { useEffect, useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import { Button, Card, PageHeader, Select } from "@/components/admin-demo/AdminDemoKit";
import SellerLevelBadge from "@/components/SellerLevelBadge";
import type { SellerLevelBadgeTone } from "@/lib/constants";

type LevelConfig = {
  level: number;
  name: string;
  badgeTone: SellerLevelBadgeTone;
  minDistinctBuyers: number;
  minAvgRating: number;
  minReviewCount: number;
  maxDisputeRatePercent: number;
  productLimit: number | null;
  feeDiscountPercent: number;
};

type Setting = {
  downgradeGraceDays: number;
  disputePartialWeight: number;
  disputeRateWindowDays: number;
  lastSweepAt: string | null;
};

const TONE_OPTIONS: { value: SellerLevelBadgeTone; label: string }[] = [
  { value: "gray", label: "Xám" },
  { value: "bronze", label: "Đồng" },
  { value: "silver", label: "Bạc" },
  { value: "gold", label: "Vàng" },
  { value: "diamond", label: "Kim cương" },
];

export default function AdminSellerLevelPanel() {
  const [configs, setConfigs] = useState<LevelConfig[]>([]);
  const [setting, setSetting] = useState<Setting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sweeping, setSweeping] = useState(false);
  const [sweepMsg, setSweepMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/seller-levels/config");
    if (res.ok) {
      const d = await res.json();
      setConfigs(d.configs);
      setSetting(d.setting);
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const updateConfig = (level: number, patch: Partial<LevelConfig>) => {
    setConfigs((prev) => prev.map((c) => (c.level === level ? { ...c, ...patch } : c)));
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/admin/seller-levels/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ configs, setting }),
    });
    const d = await res.json();
    setSaving(false);
    setMsg(res.ok ? { ok: true, text: "Đã lưu cấu hình hạng người bán." } : { ok: false, text: d.error ?? "Lưu thất bại." });
    if (res.ok) load();
  };

  const recomputeAll = async () => {
    setSweeping(true);
    setSweepMsg(null);
    const res = await fetch("/api/admin/seller-levels/recompute-all", { method: "POST" });
    const d = await res.json();
    setSweeping(false);
    setSweepMsg(res.ok ? `Đã tính lại ${d.processed} seller.` : d.error ?? "Tính lại thất bại.");
    if (res.ok) load();
  };

  if (loading || !setting) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Hạng người bán" subtitle="Đang tải..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Hạng người bán"
        subtitle="Hạng tính TỰ ĐỘNG từ số buyer khác nhau đã mua thành công, điểm đánh giá trung bình, và tỉ lệ khiếu nại/hoàn tiền gần đây — đạt 1 hạng cần thoả ĐỦ CẢ BA điều kiện. Sửa ngưỡng/quyền lợi từng hạng bên dưới."
      />

      <Card padding="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-[var(--adm-text)]">Tính lại toàn bộ</h3>
            <p className="text-[11px] text-[var(--adm-muted)]">
              Chạy ngay thay vì chờ cron hàng ngày (16:00 UTC). Seller đang bị khoá hạng (xem trang Người bán) sẽ được
              bỏ qua.
              {setting.lastSweepAt && ` Lần quét gần nhất: ${new Date(setting.lastSweepAt).toLocaleString("vi-VN")}.`}
            </p>
          </div>
          <Button variant="primary" disabled={sweeping} onClick={recomputeAll}>
            <RefreshCw className="h-3.5 w-3.5" /> {sweeping ? "Đang tính..." : "Tính lại toàn bộ"}
          </Button>
        </div>
        {sweepMsg && <p className="mt-3 text-xs font-semibold text-[var(--adm-text)]">{sweepMsg}</p>}
      </Card>

      <Card padding="p-5">
        <h3 className="mb-3 text-sm font-black text-[var(--adm-text)]">Ngưỡng + quyền lợi từng hạng</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--adm-border)] text-left text-[11px] font-bold uppercase tracking-wide text-[var(--adm-muted)]">
                <th className="py-2 pr-2">Hạng</th>
                <th className="px-2">Tên</th>
                <th className="px-2">Màu badge</th>
                <th className="px-2">Buyer khác nhau ≥</th>
                <th className="px-2">Rating TB ≥</th>
                <th className="px-2">Số review ≥</th>
                <th className="px-2">Khiếu nại &lt;%</th>
                <th className="px-2">Giới hạn SP</th>
                <th className="px-2">Giảm phí sàn %</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((c) => (
                <tr key={c.level} className="border-b border-[var(--adm-border)] last:border-0">
                  <td className="py-2 pr-2">
                    <SellerLevelBadge level={c.level} name={c.name} tone={c.badgeTone} />
                  </td>
                  <td className="px-2">
                    <input
                      value={c.name}
                      onChange={(e) => updateConfig(c.level, { name: e.target.value })}
                      className="w-28 rounded-md border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-2 py-1 text-[var(--adm-text)] outline-none"
                    />
                  </td>
                  <td className="px-2">
                    <Select value={c.badgeTone} onChange={(e) => updateConfig(c.level, { badgeTone: e.target.value as SellerLevelBadgeTone })}>
                      {TONE_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-2">
                    <input
                      type="number"
                      min={0}
                      value={c.minDistinctBuyers}
                      onChange={(e) => updateConfig(c.level, { minDistinctBuyers: Number(e.target.value) })}
                      className="w-20 rounded-md border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-2 py-1 text-[var(--adm-text)] outline-none tabular-nums"
                    />
                  </td>
                  <td className="px-2">
                    <input
                      type="number"
                      min={0}
                      max={5}
                      step={0.1}
                      value={c.minAvgRating}
                      onChange={(e) => updateConfig(c.level, { minAvgRating: Number(e.target.value) })}
                      className="w-16 rounded-md border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-2 py-1 text-[var(--adm-text)] outline-none tabular-nums"
                    />
                  </td>
                  <td className="px-2">
                    <input
                      type="number"
                      min={0}
                      value={c.minReviewCount}
                      onChange={(e) => updateConfig(c.level, { minReviewCount: Number(e.target.value) })}
                      className="w-16 rounded-md border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-2 py-1 text-[var(--adm-text)] outline-none tabular-nums"
                    />
                  </td>
                  <td className="px-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={c.maxDisputeRatePercent}
                      onChange={(e) => updateConfig(c.level, { maxDisputeRatePercent: Number(e.target.value) })}
                      className="w-16 rounded-md border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-2 py-1 text-[var(--adm-text)] outline-none tabular-nums"
                    />
                  </td>
                  <td className="px-2">
                    <input
                      type="number"
                      min={0}
                      placeholder="không giới hạn"
                      value={c.productLimit ?? ""}
                      onChange={(e) => updateConfig(c.level, { productLimit: e.target.value === "" ? null : Number(e.target.value) })}
                      className="w-24 rounded-md border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-2 py-1 text-[var(--adm-text)] outline-none tabular-nums"
                    />
                  </td>
                  <td className="px-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={c.feeDiscountPercent}
                      onChange={(e) => updateConfig(c.level, { feeDiscountPercent: Number(e.target.value) })}
                      className="w-16 rounded-md border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-2 py-1 text-[var(--adm-text)] outline-none tabular-nums"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-[var(--adm-muted)]">
          Giới hạn SP chỉ chặn ĐĂNG MỚI (sản phẩm cũ vượt hạn không bị ẩn/xoá). Giảm phí sàn = 0% là KHÔNG có tác dụng
          gì — chỉ áp dụng khi đặt số khác 0.
        </p>
      </Card>

      <Card padding="p-5">
        <h3 className="mb-3 text-sm font-black text-[var(--adm-text)]">Cấu hình chung</h3>
        <div className="flex flex-wrap gap-5">
          <div>
            <label className="mb-1 block text-[11px] text-[var(--adm-muted)]">Số ngày chờ trước khi tụt hạng thật</label>
            <input
              type="number"
              min={0}
              value={setting.downgradeGraceDays}
              onChange={(e) => setSetting({ ...setting, downgradeGraceDays: Number(e.target.value) })}
              className="w-24 rounded-md border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-2 py-1.5 text-sm text-[var(--adm-text)] outline-none tabular-nums"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-[var(--adm-muted)]">Trọng số khiếu nại hoàn 1 phần (0–1)</label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={setting.disputePartialWeight}
              onChange={(e) => setSetting({ ...setting, disputePartialWeight: Number(e.target.value) })}
              className="w-24 rounded-md border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-2 py-1.5 text-sm text-[var(--adm-text)] outline-none tabular-nums"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-[var(--adm-muted)]">Cửa sổ tính tỉ lệ khiếu nại (ngày)</label>
            <input
              type="number"
              min={1}
              value={setting.disputeRateWindowDays}
              onChange={(e) => setSetting({ ...setting, disputeRateWindowDays: Number(e.target.value) })}
              className="w-24 rounded-md border border-[var(--adm-border)] bg-[var(--adm-surface-2)] px-2 py-1.5 text-sm text-[var(--adm-text)] outline-none tabular-nums"
            />
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="primary" disabled={saving} onClick={save}>
          <Save className="h-3.5 w-3.5" /> {saving ? "Đang lưu..." : "Lưu tất cả"}
        </Button>
        {msg && (
          <p className={`text-xs font-semibold ${msg.ok ? "text-[var(--adm-success)]" : "text-[var(--adm-danger)]"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </div>
  );
}
