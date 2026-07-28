"use client";

// Panel sửa cấu hình thanh toán (VNPay/USDT/Ngân hàng) — thay .env bằng bảng
// PaymentConfig, admin sửa trực tiếp qua UI này. Giá trị DB LUÔN ưu tiên hơn
// .env; nút "Khôi phục .env" xoá dòng DB tương ứng để quay lại dùng .env.
// Chỉ những field admin THỰC SỰ sửa mới gửi lên PATCH (dirty tracking) — field
// chưa đụng tới giữ nguyên hành vi fallback .env, không bị "khoá cứng" vào DB
// một cách vô tình.
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Loader2, RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, Field, SectionTitle, StatusBadge, TextInput } from "@/components/admin-demo/AdminDemoKit";
import type { PaymentConfigKey, PaymentConfigSource } from "@/lib/payment/config";

type ConfigEntry = { value: string | undefined; source: PaymentConfigSource };
type ConfigMap = Record<PaymentConfigKey, ConfigEntry>;

const SOURCE_LABEL: Record<PaymentConfigSource, { text: string; tone: "success" | "info" | "warn" }> = {
  db: { text: "Admin đã cấu hình", tone: "success" },
  env: { text: "Đang dùng mặc định .env", tone: "info" },
  none: { text: "Chưa cấu hình", tone: "warn" },
};

function SourceTag({ source }: { source: PaymentConfigSource }) {
  const s = SOURCE_LABEL[source];
  return (
    <StatusBadge tone={s.tone} dot>
      {s.text}
    </StatusBadge>
  );
}

export default function AdminPaymentConfigPanel() {
  const [config, setConfig] = useState<ConfigMap | null>(null);
  const [values, setValues] = useState<Partial<Record<PaymentConfigKey, string>>>({});
  const [dirty, setDirty] = useState<Set<PaymentConfigKey>>(new Set());
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const load = async () => {
    const res = await fetch("/api/admin/payment-config");
    if (res.ok) {
      const data = await res.json();
      setConfig(data.config);
      const initial: Partial<Record<PaymentConfigKey, string>> = {};
      for (const key of Object.keys(data.config) as PaymentConfigKey[]) {
        initial[key] = data.config[key].value ?? "";
      }
      setValues(initial);
      setDirty(new Set());
    }
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const setField = (key: PaymentConfigKey, v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setDirty((prev) => new Set(prev).add(key));
  };

  const save = async (keys: PaymentConfigKey[]) => {
    setSaving(keys.join(","));
    setMessage(null);
    const updates: Record<string, string | null> = {};
    for (const key of keys) {
      const v = (values[key] ?? "").trim();
      updates[key] = v ? v : null;
    }
    const res = await fetch("/api/admin/payment-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
    const data = await res.json().catch(() => null);
    setSaving(null);
    if (!res.ok) {
      setMessage({ tone: "danger", text: data?.error ?? "Không thể lưu cấu hình." });
      return;
    }
    setMessage({ tone: "success", text: "Đã lưu." });
    await load();
  };

  const restoreToEnv = async (keys: PaymentConfigKey[]) => {
    setSaving(`restore:${keys.join(",")}`);
    setMessage(null);
    const updates: Record<string, string | null> = {};
    for (const key of keys) updates[key] = null;
    const res = await fetch("/api/admin/payment-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
    setSaving(null);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setMessage({ tone: "danger", text: data?.error ?? "Không thể khôi phục." });
      return;
    }
    setMessage({ tone: "success", text: "Đã khôi phục về mặc định .env." });
    await load();
  };

  if (!config) {
    return (
      <Card>
        <p className="text-sm text-[var(--adm-muted)]">Đang tải...</p>
      </Card>
    );
  }

  const vnpayKeys: PaymentConfigKey[] = ["vnpay_tmn_code", "vnpay_hash_secret"];
  const usdtKeys: PaymentConfigKey[] = ["usdt_trc20_address", "usdt_vnd_rate"];
  const bankKeys: PaymentConfigKey[] = ["bank_name", "bank_account_number", "bank_account_holder", "bank_bin"];

  const groupDirty = (keys: PaymentConfigKey[]) => keys.some((k) => dirty.has(k));

  return (
    <div className="flex flex-col gap-6">
      {message && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold ${
            message.tone === "success"
              ? "border-[var(--adm-success)]/30 bg-[var(--adm-success)]/10 text-[var(--adm-success)]"
              : "border-[var(--adm-danger)]/30 bg-[var(--adm-danger)]/10 text-[var(--adm-danger)]"
          }`}
        >
          {message.tone === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* VNPay */}
      <Card>
        <SectionTitle
          aside={
            <SourceTag
              source={
                config.vnpay_tmn_code.source === "db" || config.vnpay_hash_secret.source === "db"
                  ? "db"
                  : config.vnpay_tmn_code.source
              }
            />
          }
        >
          VNPay (thanh toán tự động)
        </SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mã TMN Code">
            <TextInput
              value={values.vnpay_tmn_code ?? ""}
              onChange={(e) => setField("vnpay_tmn_code", e.target.value)}
              placeholder="Chưa cấu hình"
            />
          </Field>
          <Field label="Hash Secret">
            <div className="relative">
              <TextInput
                type={showSecret ? "text" : "password"}
                value={values.vnpay_hash_secret ?? ""}
                onChange={(e) => setField("vnpay_hash_secret", e.target.value)}
                placeholder="Chưa cấu hình"
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--adm-muted)] hover:text-[var(--adm-text)]"
                aria-label={showSecret ? "Ẩn" : "Hiện"}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button size="sm" disabled={!groupDirty(vnpayKeys) || saving !== null} onClick={() => save(vnpayKeys)}>
            {saving === vnpayKeys.join(",") ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Lưu
          </Button>
          <Button size="sm" variant="secondary" disabled={saving !== null} onClick={() => restoreToEnv(vnpayKeys)}>
            <RotateCcw className="h-3.5 w-3.5" /> Khôi phục .env
          </Button>
        </div>
      </Card>

      {/* USDT */}
      <Card>
        <SectionTitle
          aside={
            <SourceTag
              source={
                config.usdt_trc20_address.source === "db" || config.usdt_vnd_rate.source === "db"
                  ? "db"
                  : config.usdt_trc20_address.source
              }
            />
          }
        >
          USDT TRC20 (nạp tiền)
        </SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Địa chỉ ví TRC20">
            <TextInput
              value={values.usdt_trc20_address ?? ""}
              onChange={(e) => setField("usdt_trc20_address", e.target.value)}
              placeholder="Chưa cấu hình"
            />
          </Field>
          <Field label="Tỷ giá VNĐ / 1 USDT" hint="Cập nhật theo thị trường">
            <TextInput
              type="number"
              min="1"
              value={values.usdt_vnd_rate ?? ""}
              onChange={(e) => setField("usdt_vnd_rate", e.target.value)}
              placeholder="Chưa cấu hình"
            />
          </Field>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button size="sm" disabled={!groupDirty(usdtKeys) || saving !== null} onClick={() => save(usdtKeys)}>
            {saving === usdtKeys.join(",") ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Lưu
          </Button>
          <Button size="sm" variant="secondary" disabled={saving !== null} onClick={() => restoreToEnv(usdtKeys)}>
            <RotateCcw className="h-3.5 w-3.5" /> Khôi phục .env
          </Button>
        </div>
      </Card>

      {/* Ngân hàng */}
      <Card>
        <SectionTitle
          aside={
            <SourceTag
              source={bankKeys.some((k) => config[k].source === "db") ? "db" : config.bank_name.source}
            />
          }
        >
          Chuyển khoản ngân hàng (nạp tiền)
        </SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tên ngân hàng">
            <TextInput
              value={values.bank_name ?? ""}
              onChange={(e) => setField("bank_name", e.target.value)}
              placeholder="Chưa cấu hình"
            />
          </Field>
          <Field label="Số tài khoản">
            <TextInput
              value={values.bank_account_number ?? ""}
              onChange={(e) => setField("bank_account_number", e.target.value)}
              placeholder="Chưa cấu hình"
            />
          </Field>
          <Field label="Chủ tài khoản">
            <TextInput
              value={values.bank_account_holder ?? ""}
              onChange={(e) => setField("bank_account_holder", e.target.value)}
              placeholder="Chưa cấu hình"
            />
          </Field>
          <Field label="Mã ngân hàng (BIN)" hint="Dùng tạo mã QR VietQR, không bắt buộc">
            <TextInput
              value={values.bank_bin ?? ""}
              onChange={(e) => setField("bank_bin", e.target.value)}
              placeholder="Không bắt buộc"
            />
          </Field>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button size="sm" disabled={!groupDirty(bankKeys) || saving !== null} onClick={() => save(bankKeys)}>
            {saving === bankKeys.join(",") ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Lưu
          </Button>
          <Button size="sm" variant="secondary" disabled={saving !== null} onClick={() => restoreToEnv(bankKeys)}>
            <RotateCcw className="h-3.5 w-3.5" /> Khôi phục .env
          </Button>
        </div>
      </Card>
    </div>
  );
}
