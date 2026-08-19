"use client";

// Panel THẬT "Sản phẩm chờ duyệt" — giao diện đồng bộ với bản demo đã duyệt
// (AdminDemoProducts.tsx), dùng chung AdminDemoKit. TOÀN BỘ dữ liệu/hành vi
// vẫn THẬT: fetch GET /api/admin/products, POST /api/admin/products/[id]
// {action:"approve"|"reject"} — không đổi 1 dòng logic nghiệp vụ. API route
// đã có sẵn requireAdmin() (không đụng tới).
import { Check, ChevronDown, ChevronUp, ExternalLink, PackageSearch, ShieldAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, EmptyState, ListSkeleton, formatVndDemo } from "@/components/admin-demo/AdminDemoKit";

type PendingProduct = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string[];
  tutTrickContent: string | null;
  toolUsageGuide: string | null;
  price: number;
  stock: number;
  imageUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  createdAt: string;
  categoryName: string;
  seller: { shopName: string; slug: string };
  productType: string;
  toolDeliveryLink: string | null;
};

// Chỉ mở đúng 1 đích cố định (virustotal.com) để admin tự dán link tool vào
// quét — KHÔNG tự động gửi/tải bất kỳ nội dung nào của seller lên đó.
const VIRUSTOTAL_URL = "https://www.virustotal.com/gui/home/url";

export default function AdminProductsPanel() {
  const [products, setProducts] = useState<PendingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // PRODUCT_LISTING_AUDIT.md #10 — mô tả chi tiết/nội dung TUT_TRICK/TOOL
  // gấp gọn mặc định (có thể dài tới 20.000 ký tự), admin tự bung ra xem
  // trước khi duyệt thay vì hiện tràn lan luôn.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCopyLink = async (id: string, link: string) => {
    await navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500);
  };

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/products");
    if (res.ok) {
      const data = await res.json();
      setProducts(data.products);
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
    await fetch(`/api/admin/products/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyId(null);
    load();
  };

  const pending = products.filter((p) => p.status === "PENDING");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-bold text-[var(--adm-muted)]">
        {loading ? "Đang tải..." : `${pending.length} sản phẩm đang chờ duyệt`}
      </p>

      {loading ? (
        <ListSkeleton />
      ) : pending.length === 0 ? (
        <Card>
          <EmptyState icon={PackageSearch} title="Không có sản phẩm nào đang chờ duyệt">
            Mọi sản phẩm mới đã được xử lý hết. 🎉
          </EmptyState>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((p) => (
            <Card key={p.id} className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- ảnh Blob/local công khai, xem nhanh trong bảng admin không cần next/image tối ưu
                <img src={p.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-[var(--adm-border)]" />
              ) : (
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-[var(--adm-surface-2)] text-[var(--adm-muted)] ring-1 ring-[var(--adm-border)]">
                  <PackageSearch className="h-6 w-6" strokeWidth={1.6} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[var(--adm-text)]">{p.name}</p>
                <p className="mt-0.5 text-xs text-[var(--adm-muted)]">
                  {p.seller.shopName} · {p.categoryName} · {formatVndDemo(p.price)} · Kho {p.stock} ·{" "}
                  {new Date(p.createdAt).toLocaleString("vi-VN")}
                </p>
                <p className="mt-1 text-xs text-[var(--adm-text)]/70">{p.shortDescription}</p>

                <button
                  type="button"
                  onClick={() => setExpandedId((cur) => (cur === p.id ? null : p.id))}
                  className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-[var(--adm-brand)] hover:underline"
                >
                  {expandedId === p.id ? (
                    <>
                      <ChevronUp className="h-3 w-3" /> Ẩn nội dung đầy đủ
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" /> Xem nội dung đầy đủ trước khi duyệt
                    </>
                  )}
                </button>
                {expandedId === p.id && (
                  <div className="mt-2 flex flex-col gap-2 rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-2)] p-3">
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase text-[var(--adm-muted)]">
                        Mô tả chi tiết
                      </p>
                      <div className="flex flex-col gap-1 text-[12px] leading-relaxed text-[var(--adm-text)]">
                        {p.description.map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                    </div>
                    {p.productType === "TUT_TRICK" && p.tutTrickContent && (
                      <div>
                        <p className="mb-1 text-[10px] font-bold uppercase text-[var(--adm-muted)]">
                          Nội dung hướng dẫn đầy đủ (buyer trả tiền để xem — CHỈ admin thấy được ở đây)
                        </p>
                        <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-[var(--adm-text)]">
                          {p.tutTrickContent}
                        </p>
                      </div>
                    )}
                    {p.productType === "TOOL" && p.toolUsageGuide && (
                      <div>
                        <p className="mb-1 text-[10px] font-bold uppercase text-[var(--adm-muted)]">
                          Quy trình sử dụng tool đầy đủ
                        </p>
                        <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-[var(--adm-text)]">
                          {p.toolUsageGuide}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tool/AI Agent giao bằng LINK TẢI — chỉ hiện link dạng
                    TEXT để admin đọc trỏ đi đâu, KHÔNG phải nút mở/tải tự
                    động (tránh admin lỡ tay click mở file lạ trên máy cá
                    nhân). Kèm cảnh báo rõ + link tiện ích VirusTotal. */}
                {p.productType === "TOOL" && p.toolDeliveryLink && (
                  <div className="mt-2 rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-2)] p-2.5">
                    <p className="mb-1 text-[10px] font-bold uppercase text-[var(--adm-muted)]">
                      Link tải tool (seller cung cấp)
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="min-w-0 flex-1 truncate rounded bg-[var(--adm-surface)] px-2 py-1 text-[11px] text-[var(--adm-text)]">
                        {p.toolDeliveryLink}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopyLink(p.id, p.toolDeliveryLink!)}
                        className="shrink-0 rounded-full border border-[var(--adm-border)] px-2.5 py-1 text-[11px] font-bold text-[var(--adm-text)] transition hover:border-[var(--adm-brand)]"
                      >
                        {copiedId === p.id ? "Đã chép" : "Sao chép"}
                      </button>
                    </div>
                    <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-[var(--adm-danger-bg)] px-2 py-1.5 text-[11px] font-semibold leading-snug text-[var(--adm-danger)]">
                      <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      KHÔNG tải/mở/chạy file từ link này trên máy cá nhân. Chỉ kiểm tra link có hợp
                      lệ, có phải hàng cấm không. Nếu cần kiểm tra file, dùng máy ảo (sandbox)
                      riêng hoặc dán link vào VirusTotal để quét.
                    </p>
                    <a
                      href={VIRUSTOTAL_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--adm-brand)] hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Mở VirusTotal để tự dán link quét
                    </a>
                  </div>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="success" disabled={busyId === p.id} onClick={() => handleAction(p.id, "approve")}>
                  <Check className="h-3.5 w-3.5" /> Duyệt
                </Button>
                <Button variant="danger" disabled={busyId === p.id} onClick={() => handleAction(p.id, "reject")}>
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
