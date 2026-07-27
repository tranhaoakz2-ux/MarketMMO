"use client";

import { AlertTriangle, LogIn, ShieldAlert } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Product } from "@/data/products";
import {
  SERVICE_DELIVERY_METHOD_LABEL,
  SERVICE_DELIVERY_METHODS,
  type ServiceDeliveryMethod,
} from "@/lib/constants";
import { formatVnd } from "@/lib/format";

// BuyBox RIÊNG cho sản phẩm loại "SERVICE" — khác hẳn BuyBox.tsx (chọn
// variant + số lượng + giỏ hàng): đây là form buyer NHẬP thông tin cho
// seller thực hiện, luôn mua trực tiếp số lượng 1 (không qua giỏ hàng, xem
// lý do trong POST /api/checkout — dịch vụ chỉ đặt được 1 lần/lượt vì mỗi
// đơn gắn với đúng 1 bộ thông tin buyer cung cấp).
export default function ServiceBuyBox({ product }: { product: Product }) {
  const fields = product.serviceFields ?? [];
  const allowedMethods = (product.serviceDeliveryMethods ?? []).filter((m): m is ServiceDeliveryMethod =>
    (SERVICE_DELIVERY_METHODS as readonly string[]).includes(m)
  );
  // Sắp theo đúng thứ tự AN TOÀN GIẢM DẦN của SERVICE_DELIVERY_METHODS —
  // phương án đầu tiên hiện ra luôn là an toàn nhất trong số được phép.
  const orderedMethods = SERVICE_DELIVERY_METHODS.filter((m) => allowedMethods.includes(m));
  const notConfigured = fields.length === 0 || orderedMethods.length === 0;

  const [deliveryMethod, setDeliveryMethod] = useState<ServiceDeliveryMethod | null>(
    orderedMethods[0] ?? null
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const router = useRouter();

  const setFieldValue = (fieldKey: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldKey]: value }));
  };

  const handleSubmit = async () => {
    if (!session) {
      router.push(`/dang-nhap?callbackUrl=/san-pham/${product.slug}`);
      return;
    }
    if (!deliveryMethod) {
      setError("Vui lòng chọn phương thức bàn giao.");
      return;
    }
    const missing = fields.filter((f) => f.required && !values[f.fieldKey]?.trim());
    if (missing.length > 0) {
      setError(`Vui lòng nhập đủ thông tin: ${missing.map((f) => f.label).join(", ")}.`);
      return;
    }

    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          {
            productId: product.id,
            quantity: 1,
            serviceInput: { deliveryMethod, values, note: note.trim() || undefined },
          },
        ],
      }),
    });
    const data = await res.json().catch(() => null);
    setSubmitting(false);
    if (!res.ok) {
      setError(data?.error ?? "Không thể đặt dịch vụ.");
      return;
    }
    router.push("/don-hang");
    router.refresh();
  };

  if (notConfigured) {
    return (
      <div className="rounded-lg border border-dashed border-border-c bg-surface-alt px-3 py-4 text-center text-xs text-muted">
        Dịch vụ này chưa được người bán cấu hình đầy đủ thông tin cần thiết —
        vui lòng liên hệ người bán hoặc quay lại sau.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-2xl font-black text-danger">{formatVnd(product.price)}</p>

      <div>
        <span className="mb-1.5 block text-xs font-bold uppercase text-foreground">
          Phương thức bàn giao
        </span>
        <div className="flex flex-col gap-1.5">
          {orderedMethods.map((method, idx) => (
            <label
              key={method}
              className={`flex items-start gap-2 rounded-lg border-2 px-3 py-2 text-xs font-semibold transition ${
                deliveryMethod === method
                  ? "border-brand bg-brand-light/40 text-ink"
                  : "border-border-c bg-surface text-foreground hover:border-brand-dark"
              }`}
            >
              <input
                type="radio"
                name="deliveryMethod"
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                checked={deliveryMethod === method}
                onChange={() => setDeliveryMethod(method)}
              />
              <span>
                {SERVICE_DELIVERY_METHOD_LABEL[method]}
                {idx === 0 && (
                  <span className="ml-1.5 rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success">
                    An toàn nhất
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {fields.map((f) => (
          <div key={f.fieldKey}>
            <label className="mb-1 block text-xs font-bold text-foreground">
              {f.label}
              {f.required && <span className="text-danger"> *</span>}
              {f.inputType === "secret" && (
                <span className="ml-1 text-[10px] font-semibold text-muted">(sẽ được mã hoá)</span>
              )}
            </label>
            {f.inputType === "textarea" ? (
              <textarea
                required={f.required}
                rows={3}
                value={values[f.fieldKey] ?? ""}
                onChange={(e) => setFieldValue(f.fieldKey, e.target.value)}
                className="w-full rounded-lg border border-border-c px-3 py-2 text-sm bg-surface text-foreground focus:border-brand-dark focus:outline-none"
              />
            ) : (
              <input
                type={
                  f.inputType === "secret" ? "password" : f.inputType === "url" ? "url" : "text"
                }
                required={f.required}
                value={values[f.fieldKey] ?? ""}
                onChange={(e) => setFieldValue(f.fieldKey, e.target.value)}
                autoComplete="off"
                className="w-full rounded-lg border border-border-c px-3 py-2 text-sm bg-surface text-foreground focus:border-brand-dark focus:outline-none"
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-xs text-foreground/80">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
        <span>
          <b className="font-bold text-danger">Để an toàn:</b> nên đổi sang mật khẩu tạm thời trước
          khi bàn giao, và KHÔNG dùng tài khoản đang gắn với ví/email chính của bạn cho dịch vụ này.
        </span>
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold text-foreground">
          Ghi chú / thông tin khôi phục trước bàn giao (tuỳ chọn)
        </label>
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="VD: email khôi phục, số điện thoại khôi phục — giúp bạn có bằng chứng đối chiếu nếu xảy ra tranh chấp."
          className="w-full rounded-lg border border-border-c px-3 py-2 text-sm bg-surface text-foreground focus:border-brand-dark focus:outline-none"
        />
      </div>

      {error && (
        <p className="flex items-center gap-1.5 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}

      {session ? (
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex items-center justify-center gap-2 rounded-full bg-brand py-3.5 text-base font-black text-ink transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Đang xử lý..." : "Đặt dịch vụ"}
        </button>
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-lg border border-brand-dark/30 bg-brand-light/40 px-3 py-2.5 text-xs text-ink/80">
            ⚠️ Bạn cần{" "}
            <Link
              href={`/dang-nhap?callbackUrl=/san-pham/${product.slug}`}
              className="font-bold text-brand-dark underline"
            >
              đăng nhập
            </Link>{" "}
            để đặt dịch vụ
          </div>
          <Link
            href={`/dang-nhap?callbackUrl=/san-pham/${product.slug}`}
            className="flex items-center justify-center gap-2 rounded-full bg-brand py-3.5 text-base font-black text-ink transition hover:bg-brand-dark"
          >
            <LogIn className="h-5 w-5" /> Đăng nhập để đặt dịch vụ
          </Link>
        </>
      )}
    </div>
  );
}
