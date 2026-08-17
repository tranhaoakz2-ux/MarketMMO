"use client";

import {
  Calendar,
  Coins,
  History,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Reveal from "@/components/Reveal";
import UserAvatarUploader from "@/components/UserAvatarUploader";
import { roleLabel, type Role } from "@/lib/constants";
import { formatVnd } from "@/lib/format";

function roleBadgeClass(role: Role): string {
  if (role === "ADMIN") return "border-ink bg-ink text-white";
  if (role === "SELLER") return "border-brand-dark bg-brand text-ink";
  return "border-border-c bg-surface-alt text-muted";
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border-c bg-surface p-5 shadow-sm transition-shadow duration-300 hover:shadow-md sm:p-6">
      <h2 className="mb-5 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-foreground">
        <Icon className="h-4 w-4 text-brand-dark" /> {title}
      </h2>
      {children}
    </div>
  );
}

function TextField({
  label,
  icon: Icon,
  readOnly,
  ...props
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-foreground">{label}</label>
      <div
        className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 transition-colors ${
          readOnly
            ? "border-border-c bg-surface-alt"
            : "border-border-c focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand/25"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0 text-muted" />
        <input
          {...props}
          readOnly={readOnly}
          className={`w-full min-w-0 bg-transparent text-sm focus:outline-none ${
            readOnly ? "text-muted" : "text-foreground"
          }`}
        />
      </div>
    </div>
  );
}

export default function UserProfilePanel({
  name: initialName,
  email,
  username,
  phone: initialPhone,
  avatarUrl,
  hasPassword,
  createdAt,
  walletBalance,
  role,
  referralCode,
}: {
  name: string;
  email: string | null;
  username: string | null;
  phone: string | null;
  avatarUrl: string | null;
  hasPassword: boolean;
  createdAt: string;
  walletBalance: number;
  role: Role;
  referralCode: string | null;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const handleSaveProfile = async () => {
    setProfileError(null);
    setProfileMessage(null);
    if (name.trim().length < 2) {
      setProfileError("Tên hiển thị phải có ít nhất 2 ký tự.");
      return;
    }
    setSavingProfile(true);
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });
    const data = await res.json().catch(() => null);
    setSavingProfile(false);
    if (!res.ok) {
      setProfileError(data?.error ?? "Không thể lưu thông tin.");
      return;
    }
    setName(data.name);
    setPhone(data.phone ?? "");
    setProfileMessage("Đã lưu thông tin thành công.");
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordMessage(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setSavingPassword(true);
    const res = await fetch("/api/user/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    const data = await res.json().catch(() => null);
    setSavingPassword(false);
    if (!res.ok) {
      setPasswordError(data?.error ?? "Không thể đổi mật khẩu.");
      return;
    }
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("Đã đổi mật khẩu thành công.");
  };

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl border border-border-c bg-surface p-6 shadow-sm sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-brand/12 to-transparent"
          />
          <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-5 sm:text-left">
            <UserAvatarUploader name={name} initialAvatarUrl={avatarUrl} size={88} />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-black text-foreground sm:text-2xl">
                {name || "Người dùng"}
              </h1>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${roleBadgeClass(role)}`}
                >
                  {role !== "BUYER" && <Sparkles className="h-2.5 w-2.5" />}
                  {roleLabel[role]}
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-muted">
                  <Calendar className="h-3.5 w-3.5 text-brand-dark" />
                  Tham gia {new Date(createdAt).toLocaleDateString("vi-VN")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <Reveal delay={0.05}>
            <SectionCard icon={UserRound} title="Thông tin cá nhân">
              <div className="flex flex-col gap-4">
                <TextField
                  label="Tên hiển thị"
                  icon={UserRound}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                  placeholder="Tên hiển thị"
                />
                <TextField
                  label="Số điện thoại"
                  icon={Phone}
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={15}
                  placeholder="Chưa cập nhật"
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField label="Email" icon={Mail} readOnly value={email ?? "Chưa có"} />
                  <TextField label="Username" icon={UserRound} readOnly value={username ?? "Chưa có"} />
                </div>
                <p className="-mt-1.5 flex items-center gap-1.5 text-[11px] text-muted">
                  <Lock className="h-3 w-3 shrink-0" />
                  Email/username là định danh đăng nhập, không thể đổi tại đây.
                </p>

                {profileError && (
                  <p className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-xs font-semibold text-danger">
                    {profileError}
                  </p>
                )}
                {profileMessage && (
                  <p className="rounded-xl bg-success/10 px-3.5 py-2.5 text-xs font-semibold text-success">
                    {profileMessage}
                  </p>
                )}

                <div>
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-black text-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                  >
                    {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {savingProfile ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </div>
            </SectionCard>
          </Reveal>

          <Reveal delay={0.1}>
            <SectionCard icon={ShieldCheck} title="Bảo mật">
              {!hasPassword ? (
                <p className="flex items-center gap-2 rounded-xl bg-surface-alt px-3.5 py-3 text-sm text-muted">
                  <KeyRound className="h-4 w-4 shrink-0 text-brand-dark" />
                  Tài khoản này đăng nhập qua Google, không có mật khẩu để đổi.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  <TextField
                    label="Mật khẩu hiện tại"
                    icon={KeyRound}
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại"
                  />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <TextField
                      label="Mật khẩu mới"
                      icon={KeyRound}
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Ít nhất 6 ký tự"
                    />
                    <TextField
                      label="Xác nhận mật khẩu mới"
                      icon={KeyRound}
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới"
                    />
                  </div>

                  {passwordError && (
                    <p className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-xs font-semibold text-danger">
                      {passwordError}
                    </p>
                  )}
                  {passwordMessage && (
                    <p className="rounded-xl bg-success/10 px-3.5 py-2.5 text-xs font-semibold text-success">
                      {passwordMessage}
                    </p>
                  )}

                  <div>
                    <button
                      onClick={handleChangePassword}
                      disabled={savingPassword || !oldPassword || !newPassword}
                      className="flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-black text-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                    >
                      {savingPassword ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <KeyRound className="h-4 w-4" />
                      )}
                      {savingPassword ? "Đang đổi..." : "Đổi mật khẩu"}
                    </button>
                  </div>
                </div>
              )}

              <Link
                href="/lay-2fa"
                className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-border-c px-3.5 py-3 text-sm transition-colors hover:border-brand-dark hover:bg-brand-light/20"
              >
                <span className="flex items-center gap-2.5 font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-brand-dark" /> Xác thực 2 lớp (2FA)
                </span>
                <span className="text-xs font-bold text-brand-dark">Lấy mã →</span>
              </Link>
            </SectionCard>
          </Reveal>
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <Reveal delay={0.05} direction="left">
            <div className="rounded-2xl border-2 border-brand/40 bg-surface p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-foreground">
                <Wallet className="h-4 w-4 text-brand-dark" /> Tài khoản &amp; Ví
              </h2>
              <dl className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Vai trò</dt>
                  <dd className="font-bold text-foreground">{roleLabel[role]}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Ngày tham gia</dt>
                  <dd className="font-bold text-foreground">
                    {new Date(createdAt).toLocaleDateString("vi-VN")}
                  </dd>
                </div>
                {referralCode && (
                  <div className="flex items-center justify-between">
                    <dt className="text-muted">Mã giới thiệu</dt>
                    <dd className="font-mono font-bold text-foreground">{referralCode}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between border-t-2 border-dashed border-border-c pt-3.5">
                  <dt className="font-bold text-foreground">Số dư ví</dt>
                  <dd className="text-lg font-black text-brand-dark">{formatVnd(walletBalance)}</dd>
                </div>
              </dl>
              <Link
                href="/nap-tien"
                className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-brand py-2.5 text-center text-sm font-black text-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md"
              >
                <Wallet className="h-4 w-4" /> Nạp tiền
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.1} direction="left">
            <div className="rounded-2xl border border-border-c bg-surface p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-foreground">Liên kết nhanh</h2>
              <div className="flex flex-col gap-1">
                <Link
                  href="/don-hang"
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-semibold text-foreground/80 transition-colors hover:bg-surface-alt hover:text-brand-dark"
                >
                  <History className="h-4 w-4 text-brand-dark" /> Lịch sử mua
                </Link>
                <Link
                  href="/affiliate"
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-semibold text-foreground/80 transition-colors hover:bg-surface-alt hover:text-brand-dark"
                >
                  <Coins className="h-4 w-4 text-brand-dark" /> Affiliate
                </Link>
                <Link
                  href="/lay-2fa"
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-semibold text-foreground/80 transition-colors hover:bg-surface-alt hover:text-brand-dark"
                >
                  <ShieldCheck className="h-4 w-4 text-brand-dark" /> Lấy mã 2FA
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
