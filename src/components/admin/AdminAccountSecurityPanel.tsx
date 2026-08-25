"use client";

// Đổi mật khẩu/email của CHÍNH admin đang đăng nhập, ngay trong Cài đặt hệ
// thống — tránh phải ra khỏi shell Admin Control Center để vào /ho-so-ca-nhan
// (trang đó cũng không hỗ trợ đổi email, xem PATCH /api/user/profile). Đổi
// mật khẩu tái dùng NGUYÊN route chung POST /api/user/change-password (đã
// bcrypt.compare mật khẩu cũ + bcrypt.hash mật khẩu mới, không viết lại logic
// đụng mật khẩu ở đây). Đổi email dùng route riêng POST /api/admin/account/email
// (admin-only, khác PATCH /api/user/profile cố tình không cho buyer/seller
// tự đổi email).
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Loader2, Save } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Button, Card, Field, SectionTitle, TextInput } from "@/components/admin-demo/AdminDemoKit";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";

function Message({ tone, text }: { tone: "success" | "danger"; text: string }) {
  return (
    <div
      className={`mb-4 flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-xs font-semibold ${
        tone === "success"
          ? "border-[var(--adm-success)]/30 bg-[var(--adm-success)]/10 text-[var(--adm-success)]"
          : "border-[var(--adm-danger)]/30 bg-[var(--adm-danger)]/10 text-[var(--adm-danger)]"
      }`}
    >
      {tone === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
      {text}
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label}>
      <div className="relative">
        <TextInput
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-9"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--adm-muted)] hover:text-[var(--adm-text)]"
          aria-label={show ? "Ẩn" : "Hiện"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </Field>
  );
}

export default function AdminAccountSecurityPanel() {
  const { data: session, update } = useSession();

  // Đổi mật khẩu
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const savePassword = async () => {
    setPwMessage(null);
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPwMessage({ tone: "danger", text: "Vui lòng nhập đủ 3 ô." });
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPwMessage({ tone: "danger", text: `Mật khẩu mới phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.` });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ tone: "danger", text: "Mật khẩu mới nhập lại không khớp." });
      return;
    }
    if (newPassword === oldPassword) {
      setPwMessage({ tone: "danger", text: "Mật khẩu mới phải khác mật khẩu hiện tại." });
      return;
    }
    setPwSaving(true);
    const res = await fetch("/api/user/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    const data = await res.json().catch(() => null);
    setPwSaving(false);
    if (!res.ok) {
      setPwMessage({ tone: "danger", text: data?.error ?? "Không thể đổi mật khẩu." });
      return;
    }
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPwMessage({ tone: "success", text: "Đã đổi mật khẩu. Các thiết bị/phiên khác vẫn dùng được tới khi hết hạn, chỉ mật khẩu đăng nhập mới đã đổi." });
  };

  // Đổi email
  const [emailPassword, setEmailPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const saveEmail = async () => {
    setEmailMessage(null);
    if (!emailPassword || !newEmail) {
      setEmailMessage({ tone: "danger", text: "Vui lòng nhập đủ mật khẩu hiện tại và email mới." });
      return;
    }
    setEmailSaving(true);
    const res = await fetch("/api/admin/account/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: emailPassword, newEmail }),
    });
    const data = await res.json().catch(() => null);
    setEmailSaving(false);
    if (!res.ok) {
      setEmailMessage({ tone: "danger", text: data?.error ?? "Không thể đổi email." });
      return;
    }
    setEmailPassword("");
    setNewEmail("");
    setEmailMessage({
      tone: "success",
      text: "Đã đổi email đăng nhập. Phiên hiện tại vẫn còn hiệu lực — đăng xuất/đăng nhập lại để giao diện hiện đúng email mới.",
    });
    await update();
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <SectionTitle>Đổi mật khẩu đăng nhập</SectionTitle>
        <p className="mb-4 text-xs text-[var(--adm-muted)]">
          Đăng nhập bằng: <span className="font-semibold text-[var(--adm-text)]">{session?.user?.email ?? "—"}</span>.
          Bắt buộc đúng mật khẩu hiện tại — chống người khác đang mở sẵn phiên của bạn tự đổi mật khẩu.
        </p>
        {pwMessage && <Message tone={pwMessage.tone} text={pwMessage.text} />}
        <div className="grid gap-4 sm:grid-cols-3">
          <PasswordField label="Mật khẩu hiện tại" value={oldPassword} onChange={setOldPassword} autoComplete="current-password" />
          <PasswordField label="Mật khẩu mới" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
          <PasswordField label="Nhập lại mật khẩu mới" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
        </div>
        <div className="mt-4">
          <Button size="sm" disabled={pwSaving} onClick={savePassword}>
            {pwSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Đổi mật khẩu
          </Button>
        </div>
      </Card>

      <Card>
        <SectionTitle>Đổi email đăng nhập</SectionTitle>
        <p className="mb-4 text-xs text-[var(--adm-muted)]">
          Đăng nhập cũng nhận username <span className="font-semibold text-[var(--adm-text)]">admin</span> (nếu
          chưa đổi) nên đổi email không tự khoá đăng nhập của bạn. Bắt buộc đúng mật khẩu hiện tại để xác nhận.
        </p>
        {emailMessage && <Message tone={emailMessage.tone} text={emailMessage.text} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordField label="Mật khẩu hiện tại" value={emailPassword} onChange={setEmailPassword} autoComplete="current-password" />
          <Field label="Email mới">
            <TextInput
              type="email"
              autoComplete="email"
              placeholder="ban@vidu.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </Field>
        </div>
        <div className="mt-4">
          <Button size="sm" disabled={emailSaving} onClick={saveEmail}>
            {emailSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Đổi email
          </Button>
        </div>
      </Card>
    </div>
  );
}
