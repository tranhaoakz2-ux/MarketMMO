"use client";

import { Loader2, Save, UserCircle } from "lucide-react";
import { useState } from "react";
import SellerAvatarUploader from "@/components/SellerAvatarUploader";
import { Button, Card, Field, PageHeader, SectionTitle, Textarea, TextInput } from "@/components/seller-demo/DemoKit";
import {
  calcSellerProfileCompleteness,
  SELLER_DESCRIPTION_MAX_LENGTH,
  SELLER_SHOP_NAME_MAX_LENGTH,
  SELLER_SPECIALTY_MAX_LENGTH,
} from "@/lib/seller-profile";

export default function SellerProfilePanel({
  shopName: initialShopName,
  avatarUrl,
  description: initialDescription,
  specialty: initialSpecialty,
}: {
  shopName: string;
  avatarUrl: string | null;
  description: string;
  specialty: string | null;
}) {
  const [shopName, setShopName] = useState(initialShopName);
  const [description, setDescription] = useState(initialDescription);
  const [specialty, setSpecialty] = useState(initialSpecialty ?? "");
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const completeness = calcSellerProfileCompleteness({
    avatarUrl: currentAvatarUrl,
    specialty,
  });

  const handleSubmit = async () => {
    setError(null);
    setMessage(null);

    if (shopName.trim().length < 3) {
      setError("Tên gian hàng phải có ít nhất 3 ký tự.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/seller/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopName, description, specialty }),
    });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(data?.error ?? "Không thể lưu hồ sơ.");
      return;
    }
    setShopName(data.shopName);
    setDescription(data.description);
    setSpecialty(data.specialty ?? "");
    setMessage("Đã lưu hồ sơ thành công.");
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Hồ sơ cá nhân"
        subtitle="Không bắt buộc — điền đầy đủ giúp gian hàng của bạn trông đáng tin cậy hơn với người mua."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">
        <Card className="flex flex-col gap-5">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-muted">Avatar gian hàng</p>
            <SellerAvatarUploader
              shopName={shopName}
              initialAvatarUrl={currentAvatarUrl}
              size={72}
              shape="square"
              onAvatarChange={setCurrentAvatarUrl}
            />
          </div>

          <Field label="Tên gian hàng" hint={`Tối đa ${SELLER_SHOP_NAME_MAX_LENGTH} ký tự`}>
            <TextInput
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              maxLength={SELLER_SHOP_NAME_MAX_LENGTH}
              placeholder="VD: MarketMMO Store"
            />
          </Field>

          <Field label="Giới thiệu gian hàng" hint={`Tối đa ${SELLER_DESCRIPTION_MAX_LENGTH} ký tự — không bắt buộc`}>
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={SELLER_DESCRIPTION_MAX_LENGTH}
              placeholder="Mô tả ngắn gọn về gian hàng, kinh nghiệm, cam kết chất lượng..."
            />
          </Field>

          <Field
            label="Lĩnh vực chuyên / cam kết dịch vụ"
            hint={`Tối đa ${SELLER_SPECIALTY_MAX_LENGTH} ký tự — không bắt buộc`}
          >
            <TextInput
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              maxLength={SELLER_SPECIALTY_MAX_LENGTH}
              placeholder="VD: Chuyên tài khoản Gmail/Outlook, bảo hành 30 ngày"
            />
          </Field>

          {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">{error}</p>}
          {message && <p className="rounded-lg bg-success/10 px-3 py-2 text-xs font-semibold text-success">{message}</p>}

          <div>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {loading ? "Đang lưu..." : "Lưu hồ sơ"}
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-info/10 text-info">
              <UserCircle className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Mức hoàn thiện</p>
              <p className="text-2xl font-black tabular-nums text-foreground">{completeness}%</p>
            </div>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-alt">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-dark to-brand transition-all"
              style={{ width: `${completeness}%` }}
            />
          </div>
          <p className="text-[11px] text-muted">
            Tính theo avatar + lĩnh vực chuyên. Chỉ số này chỉ hiện với bạn, không hiện trên gian hàng công khai.
          </p>
          <SectionTitle>Hiện công khai</SectionTitle>
          <p className="text-[11px] text-muted">
            Avatar, tên gian hàng, giới thiệu và lĩnh vực chuyên (nếu có) sẽ hiện ở trang gian hàng công khai của bạn
            để người mua xem trước khi quyết định giao dịch.
          </p>
        </Card>
      </div>
    </div>
  );
}
