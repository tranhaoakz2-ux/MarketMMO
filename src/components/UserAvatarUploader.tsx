"use client";

import { AlertTriangle, Camera, Check, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import SellerAvatar from "@/components/SellerAvatar";

const MAX_AVATAR_SIZE = 3 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Đổi avatar cá nhân của buyer — cùng UX với SellerAvatarUploader.tsx (chọn
// ảnh -> xem trước cục bộ -> bấm "Lưu" mới thật sự upload) nhưng gọi
// POST /api/user/avatar và tái dùng SellerAvatar (component avatar chung,
// không có gì riêng cho seller) thay vì tạo component hiển thị avatar mới.
export default function UserAvatarUploader({
  name,
  initialAvatarUrl,
}: {
  name: string;
  initialAvatarUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setError("Ảnh vượt quá 3MB.");
      return;
    }

    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const cancelPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPendingFile(null);
    setError(null);
  };

  const confirmUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", pendingFile);
    const res = await fetch("/api/user/avatar", { method: "POST", body: form });
    const data = await res.json().catch(() => null);
    setUploading(false);
    if (!res.ok) {
      setError(data?.error ?? "Không thể tải ảnh lên.");
      return;
    }
    setAvatarUrl(data.avatarUrl);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPendingFile(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative inline-block">
        <SellerAvatar avatarUrl={previewUrl ?? avatarUrl} shopName={name} size={72} shape="circle" />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="Đổi avatar"
          className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-ink text-white shadow ring-2 ring-surface transition hover:bg-brand hover:text-ink"
        >
          <Camera className="h-3.5 w-3.5" />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleSelect}
        />
      </div>

      {previewUrl && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={uploading}
            onClick={confirmUpload}
            className="flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-ink transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Lưu
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={cancelPreview}
            className="flex items-center gap-1 rounded-full border border-border-c px-2.5 py-1 text-[11px] font-bold text-muted transition hover:bg-surface-alt"
          >
            <X className="h-3 w-3" /> Huỷ
          </button>
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1 text-[11px] font-semibold text-danger">
          <AlertTriangle className="h-3 w-3 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}
