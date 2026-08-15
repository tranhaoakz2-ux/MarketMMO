"use client";

// Panel sửa nội dung động trang web (ticker/tag tìm kiếm/liên hệ footer/mức
// quỹ bảo hiểm gợi ý) — thay hardcode trong code bằng bảng SiteConfig, cùng
// cơ chế fallback-về-mặc-định đã dùng ở AdminPaymentConfigPanel. Banner
// trang chủ TÁCH RIÊNG sang AdminHomeBannerPanel (model HomeBanner, hỗ trợ
// số lượng slide động + tiêu đề/mô tả/CTA — SiteConfig chỉ lưu được URL ảnh
// đơn, không đủ cho thiết kế banner mới).
import { AlertTriangle, CheckCircle2, Loader2, Plus, RotateCcw, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, Field, SectionTitle, StatusBadge, TextInput, Textarea } from "@/components/admin-demo/AdminDemoKit";
import type { SiteConfigKey, SiteConfigSource } from "@/lib/site-config";

type ConfigEntry = { value: string; source: SiteConfigSource };
type ConfigMap = Record<SiteConfigKey, ConfigEntry>;

const SOURCE_LABEL: Record<SiteConfigSource, { text: string; tone: "success" | "info" }> = {
  db: { text: "Admin đã cấu hình", tone: "success" },
  default: { text: "Đang dùng mặc định", tone: "info" },
};

function SourceTag({ source }: { source: SiteConfigSource }) {
  const s = SOURCE_LABEL[source];
  return (
    <StatusBadge tone={s.tone} dot>
      {s.text}
    </StatusBadge>
  );
}

const FOOTER_FIELDS: { key: SiteConfigKey; label: string; placeholder: string }[] = [
  { key: "footer_facebook_url", label: "Facebook", placeholder: "https://facebook.com/..." },
  { key: "footer_youtube_url", label: "YouTube", placeholder: "https://youtube.com/..." },
  { key: "footer_tiktok_url", label: "TikTok", placeholder: "https://tiktok.com/@..." },
  { key: "footer_zalo_url", label: "Zalo", placeholder: "https://zalo.me/..." },
  { key: "footer_messenger_url", label: "Messenger", placeholder: "https://m.me/..." },
  { key: "footer_phone", label: "Số điện thoại", placeholder: "0900000000" },
  { key: "footer_telegram_url", label: "Telegram", placeholder: "https://t.me/..." },
];

export default function AdminSiteContentPanel() {
  const [config, setConfig] = useState<ConfigMap | null>(null);
  const [values, setValues] = useState<Partial<Record<SiteConfigKey, string>>>({});
  const [dirty, setDirty] = useState<Set<SiteConfigKey>>(new Set());
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [tagsDirty, setTagsDirty] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const load = async () => {
    const res = await fetch("/api/admin/site-config");
    if (res.ok) {
      const data = await res.json();
      setConfig(data.config);
      const initial: Partial<Record<SiteConfigKey, string>> = {};
      for (const key of Object.keys(data.config) as SiteConfigKey[]) {
        initial[key] = data.config[key].value ?? "";
      }
      setValues(initial);
      setDirty(new Set());
      try {
        const parsed = JSON.parse(data.config.search_tags.value);
        setTags(Array.isArray(parsed) ? parsed : []);
      } catch {
        setTags([]);
      }
      setTagsDirty(false);
    }
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const setField = (key: SiteConfigKey, v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setDirty((prev) => new Set(prev).add(key));
  };

  const save = async (updates: Record<string, string | null>) => {
    const label = Object.keys(updates).join(",");
    setSaving(label);
    setMessage(null);
    const res = await fetch("/api/admin/site-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
    const data = await res.json().catch(() => null);
    setSaving(null);
    if (!res.ok) {
      setMessage({ tone: "danger", text: data?.error ?? "Không thể lưu." });
      return false;
    }
    setMessage({ tone: "success", text: "Đã lưu." });
    await load();
    return true;
  };

  const saveKeys = (keys: SiteConfigKey[]) => {
    const updates: Record<string, string | null> = {};
    for (const key of keys) {
      const v = (values[key] ?? "").trim();
      updates[key] = v ? v : null;
    }
    return save(updates);
  };

  const restoreKeys = (keys: SiteConfigKey[]) => {
    const updates: Record<string, string | null> = {};
    for (const key of keys) updates[key] = null;
    return save(updates);
  };

  const addTag = () => {
    const t = tagDraft.trim();
    if (!t || tags.includes(t) || tags.length >= 20) return;
    setTags((prev) => [...prev, t]);
    setTagDraft("");
    setTagsDirty(true);
  };

  const removeTag = (t: string) => {
    setTags((prev) => prev.filter((x) => x !== t));
    setTagsDirty(true);
  };

  const saveTags = async () => {
    const ok = await save({ search_tags: JSON.stringify(tags) });
    if (ok) setTagsDirty(false);
  };

  if (!config) {
    return (
      <Card>
        <p className="text-sm text-[var(--adm-muted)]">Đang tải...</p>
      </Card>
    );
  }

  const groupDirty = (keys: SiteConfigKey[]) => keys.some((k) => dirty.has(k));

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

      {/* Ticker */}
      <Card>
        <SectionTitle aside={<SourceTag source={config.header_ticker_text.source} />}>
          Thông báo chạy đầu trang
        </SectionTitle>
        <Field label="Nội dung">
          <Textarea
            rows={2}
            value={values.header_ticker_text ?? ""}
            onChange={(e) => setField("header_ticker_text", e.target.value)}
          />
        </Field>
        <div className="mt-4 flex items-center gap-2">
          <Button
            size="sm"
            disabled={!groupDirty(["header_ticker_text"]) || saving !== null}
            onClick={() => saveKeys(["header_ticker_text"])}
          >
            {saving === "header_ticker_text" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Lưu
          </Button>
          <Button size="sm" variant="secondary" disabled={saving !== null} onClick={() => restoreKeys(["header_ticker_text"])}>
            <RotateCcw className="h-3.5 w-3.5" /> Khôi phục mặc định
          </Button>
        </div>
      </Card>

      {/* Tag tìm kiếm phổ biến */}
      <Card>
        <SectionTitle aside={<SourceTag source={config.search_tags.source} />}>Tìm kiếm phổ biến</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <span
              key={t}
              className="flex items-center gap-1.5 rounded-full bg-[var(--adm-surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--adm-text)]"
            >
              {t}
              <button type="button" onClick={() => removeTag(t)} aria-label={`Xoá ${t}`}>
                <X className="h-3 w-3 text-[var(--adm-muted)] hover:text-[var(--adm-danger)]" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <TextInput
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Thêm tag mới..."
            maxLength={30}
            className="max-w-xs"
          />
          <Button size="sm" variant="secondary" type="button" onClick={addTag}>
            <Plus className="h-3.5 w-3.5" /> Thêm
          </Button>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button size="sm" disabled={!tagsDirty || saving !== null} onClick={saveTags}>
            {saving === "search_tags" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Lưu
          </Button>
          <Button size="sm" variant="secondary" disabled={saving !== null} onClick={() => restoreKeys(["search_tags"])}>
            <RotateCcw className="h-3.5 w-3.5" /> Khôi phục mặc định
          </Button>
        </div>
      </Card>

      {/* Liên hệ Footer */}
      <Card>
        <SectionTitle
          aside={
            <SourceTag source={FOOTER_FIELDS.some((f) => config[f.key].source === "db") ? "db" : "default"} />
          }
        >
          Liên hệ Footer
        </SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          {FOOTER_FIELDS.map((f) => (
            <Field key={f.key} label={f.label}>
              <TextInput
                value={values[f.key] ?? ""}
                onChange={(e) => setField(f.key, e.target.value)}
                placeholder={f.placeholder}
              />
            </Field>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-[var(--adm-muted)]">
          Để trống thì icon/link tương ứng tự ẩn khỏi footer (không hiện link chết).
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Button
            size="sm"
            disabled={!groupDirty(FOOTER_FIELDS.map((f) => f.key)) || saving !== null}
            onClick={() => saveKeys(FOOTER_FIELDS.map((f) => f.key))}
          >
            {saving === FOOTER_FIELDS.map((f) => f.key).join(",") ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Lưu
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={saving !== null}
            onClick={() => restoreKeys(FOOTER_FIELDS.map((f) => f.key))}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Khôi phục mặc định
          </Button>
        </div>
      </Card>

      {/* Mức quỹ bảo hiểm gợi ý */}
      <Card>
        <SectionTitle aside={<SourceTag source={config.insurance_fund_target.source} />}>
          Mức quỹ bảo hiểm gợi ý
        </SectionTitle>
        <Field label="Số tiền (VNĐ)" hint="Chỉ ảnh hưởng % hiển thị tiến độ cho seller, không chặn chức năng bán hàng.">
          <TextInput
            type="number"
            min="1"
            value={values.insurance_fund_target ?? ""}
            onChange={(e) => setField("insurance_fund_target", e.target.value)}
            className="max-w-xs"
          />
        </Field>
        <div className="mt-4 flex items-center gap-2">
          <Button
            size="sm"
            disabled={!groupDirty(["insurance_fund_target"]) || saving !== null}
            onClick={() => saveKeys(["insurance_fund_target"])}
          >
            {saving === "insurance_fund_target" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Lưu
          </Button>
          <Button size="sm" variant="secondary" disabled={saving !== null} onClick={() => restoreKeys(["insurance_fund_target"])}>
            <RotateCcw className="h-3.5 w-3.5" /> Khôi phục mặc định
          </Button>
        </div>
      </Card>
    </div>
  );
}
