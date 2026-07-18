"use client";

import { BadgeCheck, Loader2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { verificationStatusLabel, type VerificationStatus } from "@/lib/constants";

type Verification = {
  status: VerificationStatus;
  fullName: string;
  idNumber: string;
  adminNote: string | null;
  createdAt: string;
} | null;

const statusStyle: Record<VerificationStatus, string> = {
  PENDING: "bg-brand-light text-brand-dark",
  APPROVED: "bg-success/10 text-success",
  REJECTED: "bg-danger/10 text-danger",
};

export default function SellerVerificationPanel() {
  const [verification, setVerification] = useState<Verification>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/seller/verification");
    if (res.ok) {
      const data = await res.json();
      setVerification(data.verification);
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const handleSubmit = async () => {
    if (!frontFile || !backFile) {
      setError("Vui lòng chọn đủ ảnh mặt trước và mặt sau CCCD.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const formData = new FormData();
    formData.append("fullName", fullName);
    formData.append("idNumber", idNumber);
    formData.append("frontImage", frontFile);
    formData.append("backImage", backFile);

    const res = await fetch("/api/seller/verification", { method: "POST", body: formData });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Không thể gửi yêu cầu xác thực.");
      return;
    }
    load();
  };

  if (loading) return <p className="text-sm text-muted">Đang tải...</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg bg-info-light px-3 py-2.5 text-xs text-info">
        Ảnh CCCD được lưu trữ riêng tư, chỉ bạn và quản trị viên xem được — không hiển thị công
        khai ở bất kỳ đâu trên trang.
      </div>

      {verification && (
        <div className="rounded-xl border border-border-c bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-ink">Trạng thái hiện tại</p>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle[verification.status]}`}
            >
              {verificationStatusLabel[verification.status]}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            {verification.fullName} · {verification.idNumber} · gửi lúc{" "}
            {new Date(verification.createdAt).toLocaleString("vi-VN")}
          </p>
          {verification.adminNote && (
            <p className="mt-2 rounded-lg bg-surface-alt px-3 py-2 text-xs text-ink">
              Ghi chú từ admin: {verification.adminNote}
            </p>
          )}
        </div>
      )}

      {verification?.status !== "APPROVED" && (
        <div className="rounded-2xl border border-dashed border-brand-dark/40 bg-brand-light/15 p-4">
          <h2 className="mb-3 text-sm font-bold text-ink">
            {verification ? "Gửi lại thông tin xác thực" : "Gửi yêu cầu xác thực CCCD"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">Họ tên đầy đủ</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Đúng như trên CCCD"
                className="w-full rounded-lg border border-border-c px-3 py-2 text-sm focus:border-brand-dark focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">Số CCCD/CMND</label>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ""))}
                placeholder="9-12 chữ số"
                className="w-full rounded-lg border border-border-c px-3 py-2 text-sm focus:border-brand-dark focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">Ảnh mặt trước</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setFrontFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-lg border border-border-c px-3 py-2 text-xs focus:border-brand-dark focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">Ảnh mặt sau</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setBackFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-lg border border-border-c px-3 py-2 text-xs focus:border-brand-dark focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-4 flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-black text-ink transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Gửi xác thực
          </button>
        </div>
      )}

      {verification?.status === "APPROVED" && (
        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success">
          <BadgeCheck className="h-5 w-5" />
          Gian hàng của bạn đã được xác thực — badge &quot;Đã xác thực&quot; đã hiển thị công
          khai.
        </div>
      )}
    </div>
  );
}
