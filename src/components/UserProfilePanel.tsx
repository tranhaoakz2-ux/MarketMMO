"use client";

import {
  Coins,
  History,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import UserAvatarUploader from "@/components/UserAvatarUploader";
import { roleLabel, type Role } from "@/lib/constants";
import { formatVnd } from "@/lib/format";

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
      <div>
        <h1 className="text-2xl font-black text-foreground">Hồ Sơ Cá Nhân</h1>
        <p className="mt-1 text-sm text-muted">Quản lý thông tin tài khoản và mật khẩu của bạn.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-border-c bg-surface p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-foreground">
              <UserRound className="h-4 w-4 text-brand-dark" /> Thông tin cơ bản
            </h2>

            <div className="mb-5">
              <UserAvatarUploader name={name} initialAvatarUrl={avatarUrl} />
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">Tên hiển thị</label>
                <div className="flex items-center gap-2 rounded-lg border border-border-c px-3 py-2.5 focus-within:border-brand-dark">
                  <UserRound className="h-4 w-4 text-muted" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={50}
                    placeholder="Tên hiển thị"
                    className="w-full bg-transparent text-sm text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">Số điện thoại</label>
                <div className="flex items-center gap-2 rounded-lg border border-border-c px-3 py-2.5 focus-within:border-brand-dark">
                  <Phone className="h-4 w-4 text-muted" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={15}
                    placeholder="Chưa cập nhật"
                    className="w-full bg-transparent text-sm text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-foreground">Email</label>
                  <div className="flex items-center gap-2 rounded-lg border border-border-c bg-surface-alt px-3 py-2.5">
                    <Mail className="h-4 w-4 text-muted" />
                    <span className="truncate text-sm text-muted">{email ?? "Chưa có"}</span>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-foreground">Username</label>
                  <div className="flex items-center gap-2 rounded-lg border border-border-c bg-surface-alt px-3 py-2.5">
                    <UserRound className="h-4 w-4 text-muted" />
                    <span className="truncate text-sm text-muted">{username ?? "Chưa có"}</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-muted">
                Email/username là định danh đăng nhập, không thể đổi tại đây.
              </p>

              {profileError && (
                <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
                  {profileError}
                </p>
              )}
              {profileMessage && (
                <p className="rounded-lg bg-success/10 px-3 py-2 text-xs font-semibold text-success">
                  {profileMessage}
                </p>
              )}

              <div>
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-black text-ink transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {savingProfile ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border-c bg-surface p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-foreground">
              <KeyRound className="h-4 w-4 text-brand-dark" /> Đổi mật khẩu
            </h2>

            {!hasPassword ? (
              <p className="rounded-lg bg-surface-alt px-3 py-2.5 text-sm text-muted">
                Tài khoản này đăng nhập qua Google, không có mật khẩu để đổi.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-foreground">Mật khẩu hiện tại</label>
                  <div className="flex items-center gap-2 rounded-lg border border-border-c px-3 py-2.5 focus-within:border-brand-dark">
                    <KeyRound className="h-4 w-4 text-muted" />
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Nhập mật khẩu hiện tại"
                      className="w-full bg-transparent text-sm text-foreground focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-foreground">Mật khẩu mới</label>
                    <div className="flex items-center gap-2 rounded-lg border border-border-c px-3 py-2.5 focus-within:border-brand-dark">
                      <KeyRound className="h-4 w-4 text-muted" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Ít nhất 6 ký tự"
                        className="w-full bg-transparent text-sm text-foreground focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-foreground">Xác nhận mật khẩu mới</label>
                    <div className="flex items-center gap-2 rounded-lg border border-border-c px-3 py-2.5 focus-within:border-brand-dark">
                      <KeyRound className="h-4 w-4 text-muted" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới"
                        className="w-full bg-transparent text-sm text-foreground focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {passwordError && (
                  <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
                    {passwordError}
                  </p>
                )}
                {passwordMessage && (
                  <p className="rounded-lg bg-success/10 px-3 py-2 text-xs font-semibold text-success">
                    {passwordMessage}
                  </p>
                )}

                <div>
                  <button
                    onClick={handleChangePassword}
                    disabled={savingPassword || !oldPassword || !newPassword}
                    className="flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-black text-ink transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    {savingPassword ? "Đang đổi..." : "Đổi mật khẩu"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border-c bg-surface p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-foreground">Thông tin tài khoản</h2>
            <dl className="flex flex-col gap-2.5 text-sm">
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
              <div className="flex items-center justify-between">
                <dt className="text-muted">Số dư ví</dt>
                <dd className="font-black text-brand-dark">{formatVnd(walletBalance)}</dd>
              </div>
              {referralCode && (
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Mã giới thiệu</dt>
                  <dd className="font-bold text-foreground">{referralCode}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-2xl border border-border-c bg-surface p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-foreground">Liên kết nhanh</h2>
            <div className="flex flex-col gap-1">
              <Link
                href="/don-hang"
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-foreground/80 transition hover:bg-surface-alt hover:text-brand-dark"
              >
                <History className="h-4 w-4 text-brand-dark" /> Lịch sử mua
              </Link>
              <Link
                href="/nap-tien"
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-foreground/80 transition hover:bg-surface-alt hover:text-brand-dark"
              >
                <Wallet className="h-4 w-4 text-brand-dark" /> Nạp tiền
              </Link>
              <Link
                href="/affiliate"
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-foreground/80 transition hover:bg-surface-alt hover:text-brand-dark"
              >
                <Coins className="h-4 w-4 text-brand-dark" /> Affiliate
              </Link>
              <Link
                href="/lay-2fa"
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-foreground/80 transition hover:bg-surface-alt hover:text-brand-dark"
              >
                <ShieldCheck className="h-4 w-4 text-brand-dark" /> Lấy mã 2FA
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
