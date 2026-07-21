"use client";

import { Loader2, Network, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";

type ProxyResult = {
  label: string;
  host: string;
  port: number;
  status: "live" | "dead" | "invalid";
  latencyMs?: number;
};

type ParsedProxy = { label: string; host: string; port: number };

function parseProxyLines(raw: string): ParsedProxy[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      let label = "";
      let rest = line;
      if (line.includes("|")) {
        const [name, ...restParts] = line.split("|");
        label = name.trim();
        rest = restParts.join("|").trim();
      }
      const [host, portStr] = rest.split(":");
      return {
        label: label || host || line,
        host: (host ?? "").trim(),
        port: Number(portStr),
      };
    });
}

export default function ProxyCheckerTool() {
  const [raw, setRaw] = useState("");
  const [results, setResults] = useState<ProxyResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    const entries = parseProxyLines(raw);
    if (entries.length === 0) {
      setError("Vui lòng nhập ít nhất một proxy.");
      return;
    }
    if (entries.length > 20) {
      setError("Chỉ kiểm tra tối đa 20 proxy mỗi lần.");
      return;
    }

    setError(null);
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch("/api/tools/check-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proxies: entries }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Không thể kiểm tra proxy.");
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
          <Network className="h-4 w-4" /> Danh sách Proxy
        </label>
        <p className="mb-1.5 text-xs text-muted">
          Định dạng: <code className="rounded bg-surface-alt px-1 py-0.5">IP:Port:User:Pass</code>{" "}
          hoặc{" "}
          <code className="rounded bg-surface-alt px-1 py-0.5">Tên|IP:Port:User:Pass</code>, mỗi
          dòng 1 proxy (tối đa 20 dòng, chỉ nhận IP công khai).
        </p>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={
            "ProxyName|45.77.12.10:8080:username:password\n103.90.227.15:8080:username:password"
          }
          rows={6}
          className="w-full rounded-lg border border-border-c px-3 py-2.5 font-mono text-sm focus:border-info focus:outline-none"
          spellCheck={false}
        />
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
          "Kiểm Tra Proxy Ngay"
        )}
      </button>

      {results && (
        <div className="flex flex-col gap-2">
          {results.map((r, i) => (
            <div
              key={i}
              className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm ${
                r.status === "live"
                  ? "border-success/30 bg-success/10"
                  : "border-danger/30 bg-danger/10"
              }`}
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{r.label}</p>
                <p className="truncate text-xs text-muted">
                  {r.host}:{r.port}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {r.status === "live" ? (
                  <>
                    <ShieldCheck className="h-4 w-4 text-success" />
                    <span className="font-bold text-success">Live · {r.latencyMs}ms</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-danger" />
                    <span className="font-bold text-danger">
                      {r.status === "invalid" ? "Không hợp lệ" : "Die"}
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!results && !error && (
        <div className="rounded-2xl border border-dashed border-border-c bg-surface-alt p-8 text-center text-sm text-muted">
          Nhập danh sách proxy ở trên rồi nhấn &quot;Kiểm Tra Proxy Ngay&quot; để xem kết quả.
        </div>
      )}
    </div>
  );
}
