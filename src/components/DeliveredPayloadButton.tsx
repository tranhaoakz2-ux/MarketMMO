"use client";

import { AlertTriangle, Check, Copy, ExternalLink, Loader2, PackageOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDaysRemaining } from "@/lib/format";

const TONE_CLASS: Record<"danger" | "warn" | "safe", string> = {
  danger: "text-danger",
  warn: "text-brand-dark",
  safe: "text-muted",
};

// Hiện nội dung giao hàng thật (tài khoản/mã kích hoạt...) — xem model
// ProductStockItem + OrderItem.deliveredPayload. Cha quyết định có render
// hay không (/don-hang: `hasDeliveredPayload || canReveal`, tức có nội dung
// HOẶC còn cần xác nhận nhận hàng — xem SAO KHÔNG dùng riêng
// `hasDeliveredPayload` như trước: dịch vụ không có nội dung tự động vẫn
// cần 1 nút để buyer xác nhận, xem chi tiết dưới).
//
// KHÔNG nhận deliveredPayload qua prop — bấm "Xem" mới gọi POST
// /api/orders/[orderItemId]/reveal-delivered. Route đó GIỜ làm 2 việc atomic
// trong 1 transaction: (1) set OrderItem.receivedAt lần đầu bấm (mốc neo bắt
// đầu tính bảo hành trên TOÀN SÀN — sản phẩm/dịch vụ/tool/TUT dùng chung,
// thay hẳn nút "Xác nhận đã nhận hàng" cũ đã bỏ), (2) trả nội dung. Với dịch
// vụ (không có nội dung tự động), `deliveredPayload` trả về `null` — KHÔNG
// còn là lỗi, xem nhánh `contents.length === 0 && !usageGuide` bên dưới.
// `deliveredExpiresAt` trả về là JSON mảng CÙNG thứ tự index với
// deliveredPayload — phần tử null nghĩa là đơn vị đó không có hạn.
//
// `mode="guide"` (TUT-Trick — nội dung hướng dẫn nhiều đoạn) đổi cách hiển
// thị: khối văn bản đọc được đầy đủ (`whitespace-pre-wrap`) thay vì chip
// `<code>` bị `truncate` 1 dòng (phù hợp cho "email|password" ngắn, nhưng
// sẽ cắt cụt 1 bài hướng dẫn dài) — vẫn dùng chung 100% API/log phía trên,
// chỉ khác phần render.
//
// `mode="tool"` (Tool/AI Agent) kết hợp CẢ HAI: quy trình sử dụng (khối văn
// bản như "guide") HIỂN THỊ TRƯỚC, rồi tới credential đã giải mã (chip như
// "credential") — server (reveal-delivered) đã tự giải mã sẵn, component
// này không biết/không cần biết gì về mã hoá, chỉ render `usageGuide` +
// `deliveredPayload` (plaintext) như bình thường.
export default function DeliveredPayloadButton({
  orderItemId,
  mode = "credential",
  alreadyReceived = false,
}: {
  orderItemId: string;
  mode?: "credential" | "guide" | "tool";
  // true = OrderItem.receivedAt đã được set từ trước (lần xem này chỉ là
  // xem lại) — ẩn dòng cảnh báo "bấm = tính đã nhận hàng" vì không còn đúng
  // nữa, tránh gây hiểu lầm buyer nghĩ mỗi lần xem lại đều là 1 lần "nhận
  // hàng" mới.
  alreadyReceived?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [contents, setContents] = useState<string[]>([]);
  const [expiresAtList, setExpiresAtList] = useState<(string | null)[]>([]);
  const [usageGuide, setUsageGuide] = useState<string | null>(null);
  const [toolDeliveryLink, setToolDeliveryLink] = useState<string | null>(null);
  const [noAutoContent, setNoAutoContent] = useState(false);

  const handleOpen = async () => {
    setOpen(true);
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/orders/${orderItemId}/reveal-delivered`, { method: "POST" });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(data?.error ?? "Không thể tải nội dung đã giao.");
      return;
    }

    let parsedContents: string[] = [];
    if (data.deliveredPayload !== null) {
      try {
        const parsed = JSON.parse(data.deliveredPayload);
        parsedContents = Array.isArray(parsed) ? parsed : [String(parsed)];
      } catch {
        parsedContents = [data.deliveredPayload];
      }
    }
    setContents(parsedContents);

    let parsedExpiry: (string | null)[] = [];
    if (data.deliveredExpiresAt) {
      try {
        const parsed = JSON.parse(data.deliveredExpiresAt);
        parsedExpiry = Array.isArray(parsed) ? parsed : [];
      } catch {
        parsedExpiry = [];
      }
    }
    setExpiresAtList(parsedExpiry);
    const guide = typeof data.usageGuide === "string" ? data.usageGuide : null;
    const link = typeof data.toolDeliveryLink === "string" ? data.toolDeliveryLink : null;
    setUsageGuide(guide);
    setToolDeliveryLink(link);

    // "Không có nội dung tự động" CHỈ đúng khi THẬT SỰ không có gì để hiện —
    // trước đây chỉ xét deliveredPayload nên 1 sản phẩm TOOL có quy trình sử
    // dụng/link nhưng KHÔNG có "kho tài khoản" sẽ bị nuốt mất, buyer chỉ thấy
    // thông báo chung chung thay vì thấy usageGuide/link (lỗi có sẵn, phát
    // hiện + sửa cùng đợt thêm link tải).
    const hasToolExtras = mode === "tool" && Boolean(guide || link);
    setNoAutoContent(parsedContents.length === 0 && !hasToolExtras);

    // Lần bấm đầu tiên vừa set receivedAt ở server — làm mới trang để mốc
    // đếm ngược bảo hành (tính ở /don-hang, server component) hiện đúng
    // ngay, không cần buyer tự tải lại. Bỏ qua khi xem lại (đã set từ trước).
    if (data.justReceived) {
      router.refresh();
    }
  };

  const handleCopy = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex((i) => (i === idx ? null : i)), 1500);
  };

  // Copy TOÀN BỘ contents (mỗi tài khoản/đơn vị đã giao) vào clipboard 1 lần
  // — mỗi phần tử 1 dòng, cách nhau \n, để buyer dán thẳng vào file .txt là
  // mỗi tài khoản 1 dòng. Dùng lại đúng cơ chế navigator.clipboard.writeText
  // như handleCopy() ở trên, chỉ khác input là cả mảng join lại.
  const handleCopyAll = async () => {
    await navigator.clipboard.writeText(contents.join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  };

  if (!open) {
    return (
      <div className="mt-1 flex flex-col items-start gap-1">
        <button
          onClick={handleOpen}
          className="flex items-center gap-1 text-[10px] font-semibold text-success hover:underline"
        >
          <PackageOpen className="h-3 w-3" />
          {mode === "guide"
            ? "Xem hướng dẫn đầy đủ"
            : mode === "tool"
              ? "Xem quy trình + tài khoản"
              : "Xem thông tin đã giao"}
        </button>
        {/* Chỉ hiện cảnh báo khi đây THẬT SỰ sẽ là lần "nhận hàng" đầu tiên —
            đã nhận từ trước rồi thì bấm lại chỉ là xem lại, không nên nói
            "sẽ tính là đã nhận hàng" (không còn đúng nữa). */}
        {!alreadyReceived && (
          <p className="flex max-w-[220px] items-start gap-1 text-[10px] leading-snug text-muted">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-brand-dark" />
            Bấm để xem sản phẩm — hành động này được tính là đã nhận hàng và bắt đầu tính thời
            gian bảo hành.
          </p>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted">
        <Loader2 className="h-3 w-3 animate-spin" /> Đang tải...
      </p>
    );
  }

  if (error) {
    return (
      <div className="mt-1.5 flex flex-col items-start gap-1">
        <p className="rounded bg-danger/10 px-2 py-1 text-[10px] font-semibold text-danger">{error}</p>
        <button
          onClick={() => setOpen(false)}
          className="text-[10px] font-semibold text-muted hover:underline"
        >
          Ẩn đi
        </button>
      </div>
    );
  }

  // Dịch vụ (hoặc bất kỳ dòng hàng nào không có nội dung tự động) — buyer đã
  // được ghi nhận "đã nhận hàng" ở server (xem handleOpen), chỉ không có gì
  // để hiển thị. Ưu tiên trước cả mode="guide"/"tool" vì đây là trạng thái
  // dữ liệu, không phải loại sản phẩm.
  if (noAutoContent) {
    return (
      <div className="mt-1.5 flex w-64 flex-col gap-1.5 rounded-lg border border-success/30 bg-success/5 p-2.5">
        <p className="text-[11px] leading-relaxed text-foreground">
          Đã xác nhận nhận hàng — dịch vụ do người bán thực hiện trực tiếp, không có nội dung
          tự động để hiển thị ở đây.
        </p>
        <button
          onClick={() => setOpen(false)}
          className="self-start text-[10px] font-semibold text-muted hover:underline"
        >
          Ẩn đi
        </button>
      </div>
    );
  }

  if (mode === "guide" || mode === "tool") {
    return (
      <div className="mt-1.5 flex w-80 flex-col gap-1.5 rounded-lg border border-success/30 bg-success/5 p-2.5">
        {mode === "tool" && usageGuide && (
          <div className="rounded border border-border-c bg-surface p-2.5">
            <p className="mb-1 text-[10px] font-bold uppercase text-muted">Quy trình sử dụng</p>
            <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-foreground">
              {usageGuide}
            </p>
          </div>
        )}
        {mode === "tool" && contents.length > 0 && (
          <p className="text-[10px] font-bold uppercase text-muted">Tài khoản của bạn</p>
        )}
        {contents.length > 1 && (
          <button
            onClick={handleCopyAll}
            className="flex items-center justify-center gap-1.5 self-start rounded border border-border-c bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition hover:border-brand-dark hover:text-brand-dark"
          >
            {copiedAll ? (
              <>
                <Check className="h-3 w-3 text-success" /> Đã copy!
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" /> Copy toàn bộ ({contents.length})
              </>
            )}
          </button>
        )}
        {contents.map((content, idx) => (
          <div key={idx} className="flex items-start justify-between gap-2 rounded border border-border-c bg-surface p-2.5">
            <p className="min-w-0 flex-1 whitespace-pre-wrap text-[12px] leading-relaxed text-foreground">
              {content}
            </p>
            <button
              onClick={() => handleCopy(content, idx)}
              className="shrink-0 rounded p-1 text-muted hover:bg-surface-alt hover:text-foreground"
              aria-label="Sao chép"
            >
              {copiedIndex === idx ? (
                <Check className="h-3 w-3 text-success" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
        ))}
        {mode === "tool" && toolDeliveryLink && (
          <div className="rounded border border-border-c bg-surface p-2.5">
            <p className="mb-1 text-[10px] font-bold uppercase text-muted">Tải tool</p>
            <p className="mb-2 flex items-start gap-1 text-[10px] leading-snug text-danger">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              File do người bán cung cấp qua link ngoài — sàn không đảm bảo an toàn tuyệt đối.
              Hãy tự quét virus trước khi mở/chạy, bạn tự chịu trách nhiệm.
            </p>
            <a
              href={toolDeliveryLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-[11px] font-bold text-ink transition hover:bg-brand-dark"
            >
              <ExternalLink className="h-3 w-3" /> Mở link tải tool
            </a>
          </div>
        )}
        <button
          onClick={() => setOpen(false)}
          className="self-start text-[10px] font-semibold text-muted hover:underline"
        >
          Ẩn đi
        </button>
      </div>
    );
  }

  return (
    <div className="mt-1.5 flex w-64 flex-col gap-1.5 rounded-lg border border-success/30 bg-success/5 p-2">
      {contents.length > 1 && (
        <button
          onClick={handleCopyAll}
          className="flex items-center justify-center gap-1.5 self-start rounded border border-border-c bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition hover:border-brand-dark hover:text-brand-dark"
        >
          {copiedAll ? (
            <>
              <Check className="h-3 w-3 text-success" /> Đã copy!
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy toàn bộ ({contents.length})
            </>
          )}
        </button>
      )}
      {contents.map((content, idx) => {
        const expiresAtRaw = expiresAtList[idx];
        const expiry = expiresAtRaw ? formatDaysRemaining(expiresAtRaw) : null;
        return (
          <div key={idx} className="rounded border border-border-c bg-surface px-2 py-1">
            <div className="flex items-center justify-between gap-1.5">
              <code className="min-w-0 flex-1 truncate text-[11px] text-foreground">{content}</code>
              <button
                onClick={() => handleCopy(content, idx)}
                className="shrink-0 rounded p-1 text-muted hover:bg-surface-alt hover:text-foreground"
                aria-label="Sao chép"
              >
                {copiedIndex === idx ? (
                  <Check className="h-3 w-3 text-success" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
            {expiry && (
              <p className={`mt-0.5 text-[10px] font-semibold ${TONE_CLASS[expiry.tone]}`}>
                {expiry.label}
              </p>
            )}
          </div>
        );
      })}
      <button
        onClick={() => setOpen(false)}
        className="self-start text-[10px] font-semibold text-muted hover:underline"
      >
        Ẩn đi
      </button>
    </div>
  );
}
