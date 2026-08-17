"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Gift,
  Loader2,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  User,
  UserPlus,
} from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Reveal from "@/components/Reveal";
import TurnstileWidget, { type TurnstileWidgetHandle } from "@/components/TurnstileWidget";

// lucide-react không có icon logo thương hiệu (Google) — dùng SVG inline
// riêng theo đúng quy ước đã dùng cho Facebook/YouTube/TikTok, xem Footer.tsx.
function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" className="h-4 w-4 shrink-0" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

// Ô nhập dùng chung cho form đăng nhập/đăng ký — bo tròn + icon + focus ring
// vàng, cùng ngôn ngữ với TextField ở UserProfilePanel/DepositPanel. Hỗ trợ
// `toggleablePassword` để hiện nút mắt ẩn/hiện MẬT KHẨU — thuần đổi thuộc
// tính `type` của input trên UI, không đụng state/giá trị/logic validate.
function AuthField({
  label,
  icon: Icon,
  hint,
  toggleablePassword,
  ...props
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  toggleablePassword?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  const isPasswordField = props.type === "password";
  const inputType = isPasswordField && toggleablePassword ? (visible ? "text" : "password") : props.type;

  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-foreground">{label}</label>
      <div className="flex items-center gap-2.5 rounded-xl border border-border-c px-3.5 py-2.5 transition-colors focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand/25">
        <Icon className="h-4 w-4 shrink-0 text-muted" />
        <input
          {...props}
          type={inputType}
          className="w-full min-w-0 bg-transparent text-sm text-foreground focus:outline-none"
        />
        {isPasswordField && toggleablePassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            className="shrink-0 text-muted transition-colors hover:text-brand-dark"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export default function AuthForms({
  googleEnabled,
  turnstileSiteKey,
  callbackUrl,
  defaultRefCode,
  initialTab = "login",
}: {
  googleEnabled: boolean;
  turnstileSiteKey?: string;
  callbackUrl: string;
  defaultRefCode?: string;
  initialTab?: "login" | "register";
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">(initialTab);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginTurnstileToken, setLoginTurnstileToken] = useState("");
  // Gọi .reset() trên ref này để sinh lại challenge Turnstile mới trên CÙNG
  // widget instance (không unmount/remount cả component) — bắt buộc sau MỌI
  // lần submit thất bại (kể cả sai mật khẩu, không liên quan gì đến
  // Turnstile), vì token Turnstile chỉ dùng được 1 lần: nếu không reset, lần
  // thử lại sẽ tái sử dụng token đã bị Cloudflare tiêu thụ ở lần trước, luôn
  // báo "Xác minh chống spam thất bại" dù widget vẫn hiển thị "Success".
  const loginTurnstileRef = useRef<TurnstileWidgetHandle>(null);

  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regRefCode, setRegRefCode] = useState(defaultRefCode ?? "");
  const [regAgree, setRegAgree] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);
  const [regTurnstileToken, setRegTurnstileToken] = useState("");
  const regTurnstileRef = useRef<TurnstileWidgetHandle>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginSuccess(null);
    setLoginLoading(true);
    const res = await signIn("credentials", {
      email: loginEmail,
      password: loginPassword,
      turnstileToken: loginTurnstileToken,
      redirect: false,
    });
    setLoginLoading(false);
    if (res?.error) {
      setLoginError(
        res.code === "turnstile"
          ? "Xác minh chống spam thất bại, vui lòng thử lại."
          : res.code === "banned"
            ? "Tài khoản của bạn đã bị khoá. Liên hệ hỗ trợ nếu bạn cho rằng đây là nhầm lẫn."
            : "Email hoặc mật khẩu không đúng."
      );
      // Token Turnstile vừa dùng đã bị tiêu thụ dù đăng nhập thất bại vì lý
      // do gì đi nữa (kể cả sai mật khẩu) — bắt buộc giải lại captcha mới.
      setLoginTurnstileToken("");
      loginTurnstileRef.current?.reset();
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (regPassword !== regConfirm) {
      setRegError("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (!regAgree) {
      setRegError("Bạn cần đồng ý với điều khoản dịch vụ để đăng ký.");
      return;
    }

    setRegLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: regUsername,
        email: regEmail,
        password: regPassword,
        refCode: regRefCode,
        turnstileToken: regTurnstileToken,
      }),
    });
    const data = await res.json();

    setRegLoading(false);
    if (!res.ok) {
      setRegError(data.error ?? "Đăng ký thất bại, vui lòng thử lại.");
      // Server đã tiêu thụ token Turnstile khi xử lý request này (dù request
      // thất bại vì lý do khác như trùng email/username) — bắt buộc giải lại
      // captcha mới trước khi cho thử lại, cùng lý do như handleLogin ở trên.
      setRegTurnstileToken("");
      regTurnstileRef.current?.reset();
      return;
    }

    // Không tự đăng nhập ngay bằng cách gọi lại signIn("credentials", ...) ở
    // đây — mã xác minh Turnstile (regTurnstileToken) đã bị Cloudflare tiêu
    // thụ (dùng 1 lần) trong request POST /api/auth/register phía trên, gọi
    // lại signIn với CÙNG token đó chắc chắn bị từ chối xác minh lần 2, gây
    // lỗi CredentialsSignin — bug thật đã gặp trên production sau khi bật
    // Turnstile thật (không lộ ra lúc dev vì thiếu key thì verify luôn qua).
    // Chuyển sang tab đăng nhập, điền sẵn email, để người dùng tự đăng nhập
    // với 1 lượt xác minh Turnstile mới — an toàn và đơn giản hơn là tạo
    // thêm cơ chế "token nội bộ dùng 1 lần" chỉ để né việc đăng nhập lại.
    setTab("login");
    setLoginEmail(regEmail);
    setLoginSuccess("Đăng ký thành công! Vui lòng đăng nhập để tiếp tục.");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Hero chào mừng — cùng ngôn ngữ với khối header trang Hồ sơ cá
          nhân/Nạp tiền/2FA (dải gradient vàng nhạt phía trên, icon badge). */}
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl border border-border-c bg-surface p-6 text-center shadow-sm sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-brand/12 to-transparent"
          />
          <div className="relative flex flex-col items-center gap-3">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand text-ink shadow-sm">
              <ShieldCheck className="h-7 w-7" strokeWidth={2} />
            </span>
            <div>
              <h2 className="text-xl font-black text-foreground sm:text-2xl">Chào mừng đến với MarketMMO</h2>
              <p className="mt-1 text-sm text-muted">
                Đăng nhập hoặc tạo tài khoản để giao dịch ký quỹ an toàn, giao hàng tự động 24/7.
              </p>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="overflow-hidden rounded-2xl border border-border-c bg-surface shadow-sm">
          <div className="grid grid-cols-2 gap-1.5 bg-surface-alt p-1.5">
            <button
              type="button"
              onClick={() => setTab("login")}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-sm font-black transition-colors ${
                tab === "login"
                  ? "bg-brand text-ink shadow-sm"
                  : "text-foreground/70 hover:bg-surface hover:text-brand-dark"
              }`}
            >
              <LogIn className="h-4 w-4" /> Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => setTab("register")}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-sm font-black transition-colors ${
                tab === "register"
                  ? "bg-brand text-ink shadow-sm"
                  : "text-foreground/70 hover:bg-surface hover:text-brand-dark"
              }`}
            >
              <UserPlus className="h-4 w-4" /> Đăng ký
            </button>
          </div>

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="flex flex-col gap-4 p-6 sm:p-8">
              <AuthField
                label="Email hoặc Username"
                icon={Mail}
                type="text"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Nhập email hoặc username"
              />

              <div>
                <AuthField
                  label="Mật khẩu"
                  icon={Lock}
                  type="password"
                  toggleablePassword
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                />
                <Link
                  href="/quen-mat-khau"
                  className="mt-1.5 block text-right text-xs font-semibold text-brand-dark hover:underline"
                >
                  Quên mật khẩu?
                </Link>
              </div>

              {turnstileSiteKey && (
                <div className="flex justify-center">
                  <TurnstileWidget
                    ref={loginTurnstileRef}
                    siteKey={turnstileSiteKey}
                    onVerify={setLoginTurnstileToken}
                    onExpire={() => setLoginTurnstileToken("")}
                  />
                </div>
              )}

              {loginSuccess && (
                <p className="flex items-center gap-2 rounded-xl bg-success/10 px-3.5 py-2.5 text-xs font-semibold text-success">
                  <CheckCircle2 className="h-4 w-4 shrink-0" /> {loginSuccess}
                </p>
              )}

              {loginError && (
                <p className="flex items-center gap-2 rounded-xl bg-danger/10 px-3.5 py-2.5 text-xs font-semibold text-danger">
                  <AlertTriangle className="h-4 w-4 shrink-0" /> {loginError}
                </p>
              )}

              <button
                type="submit"
                disabled={loginLoading || (!!turnstileSiteKey && !loginTurnstileToken)}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-full bg-brand py-3.5 text-sm font-black text-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
              >
                {loginLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                {loginLoading ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>

              {googleEnabled && (
                <>
                  <div className="flex items-center gap-3 text-xs text-muted">
                    <span className="h-px flex-1 bg-border-c" /> hoặc
                    <span className="h-px flex-1 bg-border-c" />
                  </div>
                  <button
                    type="button"
                    onClick={() => signIn("google", { callbackUrl })}
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-border-c py-3 text-sm font-semibold text-foreground transition-colors hover:border-brand-dark hover:bg-surface-alt"
                  >
                    <GoogleIcon />
                    Đăng nhập với Google
                  </button>
                </>
              )}

              <p className="rounded-xl bg-surface-alt px-3.5 py-2.5 text-center text-xs text-muted">
                Tài khoản demo: buyer@marketmmo.pro / Buyer@123
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-4 p-6 sm:p-8">
              <AuthField
                label="Username"
                icon={User}
                hint="Chỉ sử dụng chữ cái và số, không dấu"
                type="text"
                required
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="Nhập username"
              />

              <AuthField
                label="Email"
                icon={Mail}
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="Nhập email"
              />

              <AuthField
                label="Mật khẩu"
                icon={Lock}
                type="password"
                toggleablePassword
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
              />

              <AuthField
                label="Xác nhận mật khẩu"
                icon={Lock}
                type="password"
                toggleablePassword
                required
                value={regConfirm}
                onChange={(e) => setRegConfirm(e.target.value)}
                placeholder="Nhập lại mật khẩu"
              />

              <AuthField
                label="Mã mời (không bắt buộc)"
                icon={Gift}
                type="text"
                value={regRefCode}
                onChange={(e) => setRegRefCode(e.target.value.toUpperCase())}
                placeholder="Nhập mã giới thiệu nếu có"
                className="uppercase"
              />

              <label className="flex items-start gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={regAgree}
                  onChange={(e) => setRegAgree(e.target.checked)}
                  className="mt-0.5 accent-brand"
                />
                Tôi đồng ý với{" "}
                <a href="/dieu-khoan-dich-vu" className="font-semibold text-brand-dark">
                  Điều khoản dịch vụ
                </a>{" "}
                và{" "}
                <a href="/chinh-sach-bao-mat" className="font-semibold text-brand-dark">
                  Chính sách bảo mật
                </a>
              </label>

              {turnstileSiteKey && (
                <div className="flex justify-center">
                  <TurnstileWidget
                    ref={regTurnstileRef}
                    siteKey={turnstileSiteKey}
                    onVerify={setRegTurnstileToken}
                    onExpire={() => setRegTurnstileToken("")}
                  />
                </div>
              )}

              {regError && (
                <p className="flex items-center gap-2 rounded-xl bg-danger/10 px-3.5 py-2.5 text-xs font-semibold text-danger">
                  <AlertTriangle className="h-4 w-4 shrink-0" /> {regError}
                </p>
              )}

              <div className="flex items-center gap-2 rounded-xl border border-border-c bg-surface-alt px-3.5 py-2.5 text-xs text-muted">
                <ShieldCheck className="h-4 w-4 shrink-0 text-success" />
                Mật khẩu được mã hoá bcrypt trước khi lưu vào cơ sở dữ liệu.
              </div>

              <button
                type="submit"
                disabled={regLoading || (!!turnstileSiteKey && !regTurnstileToken)}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-full bg-brand py-3.5 text-sm font-black text-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
              >
                {regLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {regLoading ? "Đang đăng ký..." : "Đăng ký"}
              </button>
            </form>
          )}
        </div>
      </Reveal>
    </div>
  );
}
