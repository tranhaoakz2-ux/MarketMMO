import { AdminBadge, AdminPageHeader } from "@/components/admin/AdminUi";

export const dynamic = "force-dynamic";

// Chỉ đọc SỰ TỒN TẠI của biến môi trường (đã cấu hình hay chưa) — KHÔNG bao
// giờ render giá trị thật của secret ra client, kể cả cho admin.
const integrations = [
  {
    name: "VNPay (thanh toán tự động)",
    configured: !!(process.env.VNPAY_TMN_CODE && process.env.VNPAY_HASH_SECRET),
    note: "Thiếu key thì hệ thống tự động chỉ cho phép nạp tiền thủ công (admin duyệt).",
  },
  {
    name: "Google OAuth",
    configured: !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
    note: "Thiếu key thì ẩn nút 'Đăng nhập với Google' ở trang đăng nhập.",
  },
  {
    name: "Cloudflare Turnstile (chống bot)",
    configured: !!(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY),
    note: "Thiếu key thì bỏ qua bước xác minh chống bot ở đăng nhập/đăng ký.",
  },
  {
    name: "Resend (email quên mật khẩu)",
    configured: !!process.env.RESEND_API_KEY,
    note: "Thiếu key thì link đặt lại mật khẩu chỉ log ra console server thay vì gửi email thật.",
  },
  {
    name: "Telegram Bot (thông báo seller)",
    configured: !!process.env.TELEGRAM_BOT_TOKEN,
    note: "Thiếu token thì trang Telegram Bot của seller hiện 'chưa cấu hình'.",
  },
  {
    name: "Vercel Blob (lưu trữ file)",
    configured: !!process.env.BLOB_READ_WRITE_TOKEN,
    note: "Thiếu token thì ảnh chat/sản phẩm ghi vào ổ đĩa cục bộ — KHÔNG lưu trữ lâu dài trên Vercel serverless.",
  },
  {
    name: "USDT TRC20 (nạp tiền)",
    configured: !!(process.env.USDT_TRC20_ADDRESS && process.env.USDT_VND_RATE),
    note: "Thiếu địa chỉ ví thì kênh nạp tiền USDT tắt hoàn toàn (không có fallback).",
  },
];

export default function AdminSettingsPage() {
  return (
    <div>
      <AdminPageHeader
        title="Cài đặt hệ thống"
        sub="Trạng thái các tích hợp bên thứ ba — cấu hình qua biến môi trường (.env), không sửa được trực tiếp tại đây vì lý do bảo mật."
      />
      <div className="overflow-hidden rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)]">
        {integrations.map((i) => (
          <div
            key={i.name}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--adm-border)] px-5 py-4 last:border-0"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--adm-text)]">{i.name}</p>
              <p className="mt-0.5 text-xs text-[var(--adm-muted)]">{i.note}</p>
            </div>
            <AdminBadge variant={i.configured ? "success" : "warn"}>
              {i.configured ? "Đã cấu hình" : "Chưa cấu hình"}
            </AdminBadge>
          </div>
        ))}
      </div>
    </div>
  );
}

export const metadata = { title: "Cài đặt hệ thống — Admin Control Center — MarketMMO" };
