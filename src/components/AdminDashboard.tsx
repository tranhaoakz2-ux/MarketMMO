"use client";

import {
  AlertTriangle,
  BadgeCheck,
  Check,
  ExternalLink,
  FolderPlus,
  Gavel,
  Package,
  PackageCheck,
  RefreshCcw,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { formatVnd } from "@/lib/format";
import { walletMethodLabel, walletTxStatusLabel, type WalletTxStatus } from "@/lib/constants";

type Deposit = {
  id: string;
  amount: number;
  status: WalletTxStatus;
  method: string | null;
  note: string | null;
  gatewayRef: string | null;
  createdAt: string;
  user: { email: string | null; username: string | null; name: string | null };
};

type Withdrawal = {
  id: string;
  amount: number;
  status: WalletTxStatus;
  note: string | null;
  createdAt: string;
  user: { email: string | null; username: string | null; name: string | null };
};

type Dispute = {
  id: string;
  reason: string;
  status: "OPEN" | "RESOLVED_REFUND" | "RESOLVED_RELEASE";
  createdAt: string;
  openedBy: { email: string | null; username: string | null; name: string | null };
  orderItem: {
    productName: string;
    price: number;
    quantity: number;
    product: { seller: { shopName: string } } | null;
  };
};

type Verification = {
  id: string;
  fullName: string;
  idNumber: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  seller: { shopName: string; slug: string };
};

type PendingProduct = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  createdAt: string;
  categoryName: string;
  seller: { shopName: string; slug: string };
};

type PendingCategory = {
  id: string;
  name: string;
  emoji: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  proposedBy: { shopName: string; slug: string } | null;
};

const statusStyle: Record<WalletTxStatus, string> = {
  PENDING: "bg-brand-light text-brand-dark",
  CONFIRMED: "bg-success/10 text-success",
  REJECTED: "bg-danger/10 text-danger",
};

export default function AdminDashboard() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [pendingProducts, setPendingProducts] = useState<PendingProduct[]>([]);
  const [pendingCategories, setPendingCategories] = useState<PendingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [releaseMsg, setReleaseMsg] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);
  const [auctionMsg, setAuctionMsg] = useState<string | null>(null);
  const [resolvingAuction, setResolvingAuction] = useState(false);

  const load = async () => {
    setLoading(true);
    const [depositsRes, withdrawalsRes, disputesRes, verificationsRes, productsRes, categoriesRes] =
      await Promise.all([
        fetch("/api/admin/deposits"),
        fetch("/api/admin/withdrawals"),
        fetch("/api/admin/disputes"),
        fetch("/api/admin/verifications"),
        fetch("/api/admin/products"),
        fetch("/api/admin/categories"),
      ]);
    if (depositsRes.ok) {
      const data = await depositsRes.json();
      setDeposits(data.deposits);
    }
    if (withdrawalsRes.ok) {
      const data = await withdrawalsRes.json();
      setWithdrawals(data.withdrawals);
    }
    if (disputesRes.ok) {
      const data = await disputesRes.json();
      setDisputes(data.disputes);
    }
    if (verificationsRes.ok) {
      const data = await verificationsRes.json();
      setVerifications(data.verifications);
    }
    if (productsRes.ok) {
      const data = await productsRes.json();
      setPendingProducts(data.products);
    }
    if (categoriesRes.ok) {
      const data = await categoriesRes.json();
      setPendingCategories(data.categories);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    await fetch(`/api/admin/deposits/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyId(null);
    load();
  };

  const handleWithdrawalAction = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    await fetch(`/api/admin/withdrawals/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyId(null);
    load();
  };

  const handleDisputeAction = async (id: string, action: "refund_buyer" | "release_seller") => {
    setBusyId(id);
    await fetch(`/api/admin/disputes/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyId(null);
    load();
  };

  const handleVerificationAction = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    await fetch(`/api/admin/verifications/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyId(null);
    load();
  };

  const handleProductAction = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    await fetch(`/api/admin/products/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyId(null);
    load();
  };

  const handleCategoryAction = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    await fetch(`/api/admin/categories/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyId(null);
    load();
  };

  const handleReleaseEscrow = async () => {
    setReleasing(true);
    setReleaseMsg(null);
    const res = await fetch("/api/admin/escrow/release", { method: "POST" });
    const data = await res.json();
    setReleasing(false);
    setReleaseMsg(
      res.ok
        ? `Đã giải ngân ${data.released} mục đơn hàng đến hạn.`
        : (data.error ?? "Giải ngân thất bại.")
    );
  };

  const handleResolveAuction = async () => {
    setResolvingAuction(true);
    setAuctionMsg(null);
    const res = await fetch("/api/admin/auction/resolve", { method: "POST" });
    const data = await res.json();
    setResolvingAuction(false);
    setAuctionMsg(
      res.ok
        ? `Đã xử lý ${data.resolved} vị trí đến hạn (${data.winners} vị trí có người thắng). Đã tạo phiên kế tiếp.`
        : (data.error ?? "Giải quyết đấu giá thất bại.")
    );
  };

  const pending = deposits.filter((d) => d.status === "PENDING");
  const processed = deposits.filter((d) => d.status !== "PENDING");
  const pendingWithdrawals = withdrawals.filter((w) => w.status === "PENDING");
  const processedWithdrawals = withdrawals.filter((w) => w.status !== "PENDING");
  const openDisputes = disputes.filter((d) => d.status === "OPEN");
  const pendingVerifications = verifications.filter((v) => v.status === "PENDING");
  const pendingProductsOnly = pendingProducts.filter((p) => p.status === "PENDING");
  const pendingCategoriesOnly = pendingCategories.filter((c) => c.status === "PENDING");

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-2xl border border-border-c bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
              <PackageCheck className="h-4 w-4" /> Giải ngân ký quỹ đến hạn
            </h2>
            <p className="mt-1 text-xs text-muted">
              Chuyển các mục đơn hàng đã hết thời gian ký quỹ (ESCROW) sang
              trạng thái Hoàn thành và cộng tiền vào ví người bán.
            </p>
          </div>
          <button
            onClick={handleReleaseEscrow}
            disabled={releasing}
            className="rounded-full bg-brand px-4 py-2 text-xs font-bold text-ink transition hover:bg-brand-dark disabled:opacity-60"
          >
            {releasing ? "Đang xử lý..." : "Chạy giải ngân ngay"}
          </button>
        </div>
        {releaseMsg && (
          <p className="mt-3 rounded-lg bg-surface-alt px-3 py-2 text-xs font-semibold text-ink">
            {releaseMsg}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-border-c bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
              <Gavel className="h-4 w-4" /> Giải quyết phiên đấu giá vị trí vàng
            </h2>
            <p className="mt-1 text-xs text-muted">
              Đóng các vị trí đấu giá đã hết hạn, xác định người thắng, trừ ví
              và gắn <code>featuredUntil</code> cho sản phẩm thắng, đồng thời
              mở phiên kế tiếp cho vị trí đó.
            </p>
          </div>
          <button
            onClick={handleResolveAuction}
            disabled={resolvingAuction}
            className="rounded-full bg-brand px-4 py-2 text-xs font-bold text-ink transition hover:bg-brand-dark disabled:opacity-60"
          >
            {resolvingAuction ? "Đang xử lý..." : "Giải quyết đấu giá ngay"}
          </button>
        </div>
        {auctionMsg && (
          <p className="mt-3 rounded-lg bg-surface-alt px-3 py-2 text-xs font-semibold text-ink">
            {auctionMsg}
          </p>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
            <AlertTriangle className="h-4 w-4" /> Khiếu nại đang chờ xử lý ({openDisputes.length})
          </h2>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Đang tải...</p>
        ) : openDisputes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-c bg-surface p-8 text-center text-sm text-muted">
            Không có khiếu nại nào đang chờ xử lý.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {openDisputes.map((d) => (
              <div
                key={d.id}
                className="flex flex-col gap-3 rounded-xl border border-border-c bg-surface p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-ink">{d.orderItem.productName}</p>
                    <p className="text-xs text-muted">
                      Người bán: {d.orderItem.product?.seller.shopName ?? "—"} · Mở bởi{" "}
                      {d.openedBy.name ?? d.openedBy.username ?? d.openedBy.email} ·{" "}
                      {new Date(d.createdAt).toLocaleString("vi-VN")}
                    </p>
                    <p className="mt-1 text-sm text-ink/80">{d.reason}</p>
                  </div>
                  <span className="text-base font-black text-danger">
                    {formatVnd(d.orderItem.price * d.orderItem.quantity)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDisputeAction(d.id, "refund_buyer")}
                    disabled={busyId === d.id}
                    className="flex items-center gap-1 rounded-full bg-danger px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" /> Hoàn tiền người mua
                  </button>
                  <button
                    onClick={() => handleDisputeAction(d.id, "release_seller")}
                    disabled={busyId === d.id}
                    className="flex items-center gap-1 rounded-full bg-success px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> Giải ngân người bán
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
            <BadgeCheck className="h-4 w-4" /> Yêu cầu xác thực CCCD chờ duyệt (
            {pendingVerifications.length})
          </h2>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Đang tải...</p>
        ) : pendingVerifications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-c bg-surface p-8 text-center text-sm text-muted">
            Không có yêu cầu xác thực nào đang chờ duyệt.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {pendingVerifications.map((v) => (
              <div
                key={v.id}
                className="flex flex-col gap-3 rounded-xl border border-border-c bg-surface p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-ink">{v.seller.shopName}</p>
                    <p className="text-xs text-muted">
                      {v.fullName} · {v.idNumber} ·{" "}
                      {new Date(v.createdAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`/api/admin/verifications/${v.id}/image/front`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-full bg-surface-alt px-3 py-1.5 text-xs font-semibold text-ink hover:bg-border-c"
                    >
                      Mặt trước <ExternalLink className="h-3 w-3" />
                    </a>
                    <a
                      href={`/api/admin/verifications/${v.id}/image/back`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-full bg-surface-alt px-3 py-1.5 text-xs font-semibold text-ink hover:bg-border-c"
                    >
                      Mặt sau <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVerificationAction(v.id, "approve")}
                    disabled={busyId === v.id}
                    className="flex items-center gap-1 rounded-full bg-success px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" /> Duyệt
                  </button>
                  <button
                    onClick={() => handleVerificationAction(v.id, "reject")}
                    disabled={busyId === v.id}
                    className="flex items-center gap-1 rounded-full bg-danger px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" /> Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
            <Package className="h-4 w-4" /> Sản phẩm chờ duyệt (
            {pendingProductsOnly.length})
          </h2>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Đang tải...</p>
        ) : pendingProductsOnly.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-c bg-surface p-8 text-center text-sm text-muted">
            Không có sản phẩm nào đang chờ duyệt.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {pendingProductsOnly.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-3 rounded-xl border border-border-c bg-surface p-4 shadow-sm sm:flex-row sm:items-center"
              >
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- ảnh Blob/local công khai, xem nhanh trong bảng admin không cần next/image tối ưu
                  <img
                    src={p.imageUrl}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-border-c"
                  />
                ) : (
                  <div className="h-16 w-16 shrink-0 rounded-lg bg-surface-alt ring-1 ring-border-c" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-bold text-ink">{p.name}</p>
                  <p className="text-xs text-muted">
                    {p.seller.shopName} · {p.categoryName} · {formatVnd(p.price)} · Kho{" "}
                    {p.stock} · {new Date(p.createdAt).toLocaleString("vi-VN")}
                  </p>
                  <p className="mt-1 text-xs text-ink/70">{p.shortDescription}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => handleProductAction(p.id, "approve")}
                    disabled={busyId === p.id}
                    className="flex items-center gap-1 rounded-full bg-success px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" /> Duyệt
                  </button>
                  <button
                    onClick={() => handleProductAction(p.id, "reject")}
                    disabled={busyId === p.id}
                    className="flex items-center gap-1 rounded-full bg-danger px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" /> Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
            <FolderPlus className="h-4 w-4" /> Danh mục mới chờ duyệt (
            {pendingCategoriesOnly.length})
          </h2>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Đang tải...</p>
        ) : pendingCategoriesOnly.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-c bg-surface p-8 text-center text-sm text-muted">
            Không có danh mục nào đang chờ duyệt.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {pendingCategoriesOnly.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-c bg-surface p-4 shadow-sm"
              >
                <div>
                  <p className="text-sm font-bold text-ink">
                    {c.emoji} {c.name}
                  </p>
                  <p className="text-xs text-muted">
                    Đề xuất bởi: {c.proposedBy?.shopName ?? "—"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCategoryAction(c.id, "approve")}
                    disabled={busyId === c.id}
                    className="flex items-center gap-1 rounded-full bg-success px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" /> Duyệt
                  </button>
                  <button
                    onClick={() => handleCategoryAction(c.id, "reject")}
                    disabled={busyId === c.id}
                    className="flex items-center gap-1 rounded-full bg-danger px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" /> Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">
            Yêu cầu nạp tiền chờ duyệt ({pending.length})
          </h2>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
          >
            <RefreshCcw className="h-3.5 w-3.5" /> Làm mới
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Đang tải...</p>
        ) : pending.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-c bg-surface p-8 text-center text-sm text-muted">
            Không có yêu cầu nào đang chờ duyệt.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {pending.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-c bg-surface p-4 shadow-sm"
              >
                <div>
                  <p className="text-sm font-bold text-ink">
                    {d.user.name ?? d.user.username ?? d.user.email}
                  </p>
                  <p className="text-xs text-muted">
                    {walletMethodLabel[d.method ?? ""] ?? d.method ?? "—"} ·{" "}
                    {new Date(d.createdAt).toLocaleString("vi-VN")}
                  </p>
                  {d.note && <p className="mt-1 text-xs text-muted">Ghi chú: {d.note}</p>}
                  {d.method === "usdt" && d.gatewayRef && (
                    <a
                      href={`https://tronscan.org/#/transaction/${d.gatewayRef}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 flex items-center gap-1 text-xs font-semibold text-info hover:underline"
                    >
                      Xem giao dịch trên Tronscan <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-base font-black text-danger">
                    {formatVnd(d.amount)}
                  </span>
                  <button
                    onClick={() => handleAction(d.id, "approve")}
                    disabled={busyId === d.id}
                    className="flex items-center gap-1 rounded-full bg-success px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" /> Duyệt
                  </button>
                  <button
                    onClick={() => handleAction(d.id, "reject")}
                    disabled={busyId === d.id}
                    className="flex items-center gap-1 rounded-full bg-danger px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" /> Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
            <Wallet className="h-4 w-4" /> Yêu cầu rút tiền chờ duyệt ({pendingWithdrawals.length})
          </h2>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Đang tải...</p>
        ) : pendingWithdrawals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-c bg-surface p-8 text-center text-sm text-muted">
            Không có yêu cầu rút tiền nào đang chờ duyệt.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {pendingWithdrawals.map((w) => (
              <div
                key={w.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-c bg-surface p-4 shadow-sm"
              >
                <div>
                  <p className="text-sm font-bold text-ink">
                    {w.user.name ?? w.user.username ?? w.user.email}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(w.createdAt).toLocaleString("vi-VN")}
                  </p>
                  {w.note && <p className="mt-1 text-xs text-muted">{w.note}</p>}
                  <p className="mt-1 text-xs font-semibold text-brand-dark">
                    Số tiền đã được khoá khỏi ví người bán khi tạo yêu cầu — Từ chối
                    sẽ hoàn lại, Duyệt chỉ đánh dấu đã chuyển khoản.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-base font-black text-danger">
                    {formatVnd(Math.abs(w.amount))}
                  </span>
                  <button
                    onClick={() => handleWithdrawalAction(w.id, "approve")}
                    disabled={busyId === w.id}
                    className="flex items-center gap-1 rounded-full bg-success px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" /> Đã chuyển khoản
                  </button>
                  <button
                    onClick={() => handleWithdrawalAction(w.id, "reject")}
                    disabled={busyId === w.id}
                    className="flex items-center gap-1 rounded-full bg-danger px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" /> Từ chối (hoàn tiền)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {processedWithdrawals.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-bold text-ink">Lịch sử rút tiền</h2>
          <div className="overflow-hidden rounded-xl border border-border-c bg-surface shadow-sm">
            <div className="grid grid-cols-4 gap-2 border-b border-border-c bg-surface-alt px-4 py-2.5 text-xs font-bold text-muted">
              <span>Người dùng</span>
              <span>Số tiền</span>
              <span>Thời gian</span>
              <span>Trạng thái</span>
            </div>
            {processedWithdrawals.map((w) => (
              <div
                key={w.id}
                className="grid grid-cols-4 gap-2 border-b border-border-c px-4 py-3 text-sm last:border-0"
              >
                <span className="truncate text-ink">
                  {w.user.name ?? w.user.username ?? w.user.email}
                </span>
                <span className="font-bold text-ink">{formatVnd(Math.abs(w.amount))}</span>
                <span className="text-muted">
                  {new Date(w.createdAt).toLocaleDateString("vi-VN")}
                </span>
                <span
                  className={`w-fit rounded-full px-2 py-0.5 text-xs font-bold ${statusStyle[w.status]}`}
                >
                  {walletTxStatusLabel[w.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-bold text-ink">Lịch sử xử lý nạp tiền</h2>
        <div className="overflow-hidden rounded-xl border border-border-c bg-surface shadow-sm">
          <div className="grid grid-cols-4 gap-2 border-b border-border-c bg-surface-alt px-4 py-2.5 text-xs font-bold text-muted">
            <span>Người dùng</span>
            <span>Số tiền</span>
            <span>Thời gian</span>
            <span>Trạng thái</span>
          </div>
          {processed.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted">Chưa có giao dịch nào.</div>
          ) : (
            processed.map((d) => (
              <div
                key={d.id}
                className="grid grid-cols-4 gap-2 border-b border-border-c px-4 py-3 text-sm last:border-0"
              >
                <span className="truncate text-ink">
                  {d.user.name ?? d.user.username ?? d.user.email}
                </span>
                <span className="font-bold text-ink">{formatVnd(d.amount)}</span>
                <span className="text-muted">
                  {new Date(d.createdAt).toLocaleDateString("vi-VN")}
                </span>
                <span
                  className={`w-fit rounded-full px-2 py-0.5 text-xs font-bold ${statusStyle[d.status]}`}
                >
                  {walletTxStatusLabel[d.status]}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
