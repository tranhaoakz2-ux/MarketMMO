"use client";

import { AlertTriangle, HelpCircle, Loader2, XCircle } from "lucide-react";
import { useState } from "react";

type CheckStatus = "not_found" | "checkpoint" | "maybe_live" | "invalid" | "error";

type CheckResult = {
  input: string;
  status: CheckStatus;
  detail: string;
  url?: string;
};

const MAX_TARGETS = 10;

const STATUS_META: Record<
  CheckStatus,
  { label: string; className: string; icon: typeof HelpCircle }
> = {
  maybe_live: {
    label: "Có vẻ còn hoạt động",
    className: "border-success/30 bg-success/10 text-success",
    icon: HelpCircle,
  },
  not_found: {
    label: "Không tồn tại / đã bị xoá",
    className: "border-danger/30 bg-danger/10 text-danger",
    icon: XCircle,
  },
  checkpoint: {
    label: "Nghi bị khoá / xác minh",
    className: "border-brand-dark/30 bg-brand-light/40 text-brand-dark",
    icon: AlertTriangle,
  },
  invalid: {
    label: "Không hợp lệ",
    className: "border-border-c bg-surface-alt text-muted",
    icon: XCircle,
  },
  error: {
    label: "Không kiểm tra được",
    className: "border-border-c bg-surface-alt text-muted",
    icon: AlertTriangle,
  },
};

export default function FacebookCheckerTool() {
  const [raw, setRaw] = useState("");
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    const targets = raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (targets.length === 0) {
      setError("Vui lòng nhập ít nhất một link hoặc username Facebook.");
      return;
    }
    if (targets.length > MAX_TARGETS) {
      setError(`Chỉ kiểm tra tối đa ${MAX_TARGETS} tài khoản mỗi lần.`);
      return;
    }

    setError(null);
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch("/api/tools/check-facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Không thể kiểm tra.");
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="grid h-4 w-4 place-items-center rounded-full bg-[#1877F2] text-[9px] font-black text-white">
            f
          </span>
          Link hoặc username Facebook
        </label>
        <p className="mb-1.5 text-xs text-muted">
          Mỗi dòng 1 link (vd: facebook.com/zuck) hoặc username (tối đa {MAX_TARGETS} dòng). Công
          cụ chỉ kiểm tra hồ sơ <strong>công khai</strong>, không cần và không hỏi mật khẩu.
        </p>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={"facebook.com/zuck\nnguyenvana.123"}
          rows={6}
          className="w-full rounded-lg border border-border-c px-3 py-2.5 font-mono text-sm focus:border-info focus:outline-none"
          spellCheck={false}
        />
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-info-light px-3 py-2.5 text-xs text-info">
        <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Facebook giới hạn xem nội dung với khách vãng lai, nên kết quả chỉ mang tính{" "}
          <strong>tham khảo</strong>: hệ thống chỉ chắc chắn khi phát hiện rõ dấu hiệu đã bị xoá
          hoặc bị khoá — trạng thái &quot;có vẻ còn hoạt động&quot; không đảm bảo 100% đăng nhập
          được.
        </span>
      </div>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
          {error}
        </p>
      )}

      <button
        onClick={handleCheck}
        disabled={loading}
        className="flex items-center justify-center gap-2 rounded-lg bg-info py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-info/90 disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Đang kiểm tra...
          </>
        ) : (
          "Check Live Facebook Ngay"
        )}
      </button>

      {results && (
        <div className="flex flex-col gap-2">
          {results.map((r, i) => {
            const meta = STATUS_META[r.status];
            const Icon = meta.icon;
            return (
              <div
                key={i}
                className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm ${meta.className}`}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{r.input}</p>
                  <p className="truncate text-xs opacity-80">{r.detail}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Icon className="h-4 w-4" />
                  <span className="font-bold">{meta.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!results && !error && (
        <div className="rounded-2xl border border-dashed border-border-c bg-surface-alt p-8 text-center text-sm text-muted">
          Nhập danh sách link/username Facebook ở trên rồi nhấn &quot;Check Live Facebook
          Ngay&quot; để xem kết quả.
        </div>
      )}
    </div>
  );
}
