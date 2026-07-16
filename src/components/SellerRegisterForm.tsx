"use client";

import { AlertTriangle, Info, LogIn, Smile } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SellerRegisterForm() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [facebookLink, setFacebookLink] = useState("");
  const [description, setDescription] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (status === "loading") return null;

  if (!session) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border-c bg-surface p-10 text-center shadow-sm">
        <p className="text-sm text-muted">
          Bạn cần đăng nhập để đăng ký mở gian hàng trên MarketMMO.
        </p>
        <Link
          href="/dang-nhap?callbackUrl=/tro-thanh-nguoi-ban"
          className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-black text-ink transition hover:bg-brand-dark"
        >
          <LogIn className="h-4 w-4" /> Đăng nhập ngay
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agree) {
      setError("Bạn cần đồng ý với Điều khoản & Điều luật bán hàng để tiếp tục.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/seller/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopName, phone, facebookLink, description, agree }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Đăng ký thất bại, vui lòng thử lại.");
      return;
    }

    router.push("/trang-ban-hang");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="rounded-xl border-l-4 border-brand-dark bg-brand-light/25 p-5 sm:p-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-ink">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-dark text-white">
            <Info className="h-3 w-3" />
          </span>
          Thông tin quan trọng
        </h2>
        <p className="mb-2.5 text-[15px] font-semibold text-ink">
          Khi đăng ký làm người bán:
        </p>
        <ul className="flex flex-col gap-2.5 text-[15px] leading-relaxed text-ink/80">
          <li className="flex gap-2.5">
            <span className="mt-[9px] h-2 w-2 shrink-0 rounded-full bg-brand-dark" />
            <span>
              Tài khoản của bạn sẽ được nâng cấp lên{" "}
              <strong className="text-ink">Người bán</strong> ngay sau khi đăng ký thành
              công.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="mt-[9px] h-2 w-2 shrink-0 rounded-full bg-brand-dark" />
            <span>
              Gian hàng của bạn có trang riêng công khai{" "}
              <strong className="text-ink">ngay lập tức</strong> tại địa chỉ
              marketmmo.pro/shop/tên-gian-hàng.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="mt-[9px] h-2 w-2 shrink-0 rounded-full bg-brand-dark" />
            <span>
              Doanh thu từ mỗi đơn hàng được giữ{" "}
              <strong className="text-ink">ký quỹ (escrow)</strong> rồi cộng thẳng vào ví
              của bạn sau khi hết hạn ký quỹ — hiện{" "}
              <strong className="text-ink">không thu phí sàn/hoa hồng</strong>.
            </span>
          </li>
          <li className="flex gap-2.5">
            <AlertTriangle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-danger" />
            <span>
              <strong className="text-ink">Cung cấp thông tin chính xác và trung thực.</strong>{" "}
              Thông tin sai lệch hoặc gian lận có thể dẫn đến{" "}
              <strong className="text-danger">khóa gian hàng</strong>.
            </span>
          </li>
        </ul>
      </div>

      <div>
        <label className="mb-1.5 block text-[15px] font-bold text-ink">
          Tên gian hàng <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          required
          minLength={3}
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          placeholder="VD: MarketMMO Store"
          className="w-full rounded-lg border border-border-c px-3.5 py-3 text-[15px] shadow-sm focus:border-brand-dark focus:outline-none"
        />
        <p className="mt-1 text-xs text-muted">
          Tên hiển thị công khai trên gian hàng của bạn, tối thiểu 3 ký tự.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[15px] font-bold text-ink">
            Số điện thoại <span className="text-danger">*</span>
          </label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Nhập số điện thoại"
            className="w-full rounded-lg border border-border-c px-3.5 py-3 text-[15px] shadow-sm focus:border-brand-dark focus:outline-none"
          />
          <p className="mt-1 text-xs text-muted">
            Số điện thoại sẽ được sử dụng để liên hệ khi cần thiết.
          </p>
        </div>
        <div>
          <label className="mb-1.5 block text-[15px] font-bold text-ink">Link Facebook</label>
          <input
            type="url"
            value={facebookLink}
            onChange={(e) => setFacebookLink(e.target.value)}
            placeholder="https://facebook.com/..."
            className="w-full rounded-lg border border-border-c px-3.5 py-3 text-[15px] shadow-sm focus:border-brand-dark focus:outline-none"
          />
          <p className="mt-1 text-xs text-muted">
            Link đến trang cá nhân/fanpage Facebook của bạn (không bắt buộc).
          </p>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[15px] font-bold text-ink">Giới thiệu bản thân</label>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Mô tả ngắn gọn về kinh nghiệm hoặc các sản phẩm bạn dự định bán"
          className="w-full rounded-lg border border-border-c px-3.5 py-3 text-[15px] shadow-sm focus:border-brand-dark focus:outline-none"
        />
        <p className="mt-1 text-xs text-muted">
          Mô tả ngắn gọn về kinh nghiệm hoặc các sản phẩm bạn dự định bán.
        </p>
      </div>

      <label className="flex items-start gap-2.5 rounded-xl border border-brand-dark/20 bg-brand-light/25 p-4 text-[15px] text-ink">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-0.5 h-[18px] w-[18px] accent-brand-dark"
        />
        <span>
          Tôi đã đọc và đồng ý với{" "}
          <a
            href="/dieu-khoan-ban-hang"
            className="font-semibold text-brand-dark underline"
          >
            Điều khoản &amp; Điều luật bán hàng
          </a>{" "}
          của nền tảng <span className="text-danger">*</span>
        </span>
      </label>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-c pt-5">
        <Link
          href="/"
          className="text-[15px] font-semibold text-muted transition hover:text-ink"
        >
          ← Quay lại trang chủ
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-full bg-ink px-7 py-3.5 text-[15px] font-black text-white transition hover:bg-ink-soft disabled:opacity-60"
        >
          {loading ? "Đang gửi..." : "Đăng ký"}
          <Smile className="h-[18px] w-[18px]" />
        </button>
      </div>
    </form>
  );
}
