"use client";

import { AlertTriangle, Camera, Check, ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

const MAX_COVER_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Đổi ảnh bìa gian hàng — cùng UX với SellerAvatarUploader.tsx (chọn ảnh ->
// xem trước cục bộ -> bấm "Lưu" mới thật sự upload) nhưng dạng banner ngang
// thay vì avatar tròn, gọi POST /api/seller/cover.
export default function SellerCoverUploader({
  initialCoverUrl,
  onCoverChange,
}: {
  initialCoverUrl: string | null;
  /** Gọi lại với coverUrl mới ngay sau khi upload thành công. */
  onCoverChange?: (coverUrl: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl);
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
    if (file.size > MAX_COVER_SIZE) {
      setError("Ảnh vượt quá 5MB.");
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
    const res = await fetch("/api/seller/cover", { method: "POST", body: form });
    const data = await res.json().catch(() => null);
    setUploading(false);
    if (!res.ok) {
      setError(data?.error ?? "Không thể tải ảnh lên.");
      return;
    }
    setCoverUrl(data.coverUrl);
    onCoverChange?.(data.coverUrl);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPendingFile(null);
  };

  const displayUrl = previewUrl ?? coverUrl;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-32 w-full overflow-hidden rounded-xl border border-border-c bg-gradient-to-r from-brand-dark via-brand to-brand-light sm:h-40">
        {displayUrl ? (
          <Image src={displayUrl} alt="" fill className="object-cover" sizes="480px" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-ink/70">
            <ImagePlus className="h-6 w-6" strokeWidth={1.75} />
            <span className="text-xs font-bold">Chưa có ảnh bìa</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="Đổi ảnh bìa"
          className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 rounded-full bg-ink/80 px-3 py-1.5 text-xs font-bold text-white shadow backdrop-blur transition hover:bg-brand hover:text-ink"
        >
          <Camera className="h-3.5 w-3.5" /> Đổi ảnh bìa
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
