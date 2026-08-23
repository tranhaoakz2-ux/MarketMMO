import { Card, PageHeader, SectionTitle, StatusBadge } from "@/components/admin-demo/AdminDemoKit";
import AdminPaymentConfigPanel from "@/components/admin/AdminPaymentConfigPanel";
import { requireAdminPage } from "@/lib/authz";

export const dynamic = "force-dynamic";

// Chỉ đọc SỰ TỒN TẠI của biến môi trường (đã cấu hình hay chưa) — KHÔNG bao
// giờ render giá trị thật của secret ra client, kể cả cho admin. Riêng VNPay/
// USDT/Ngân hàng đã có panel sửa được đầy đủ bên dưới (AdminPaymentConfigPanel,
// đọc/ghi bảng PaymentConfig) nên KHÔNG lặp lại ở danh sách chỉ-xem này nữa —
// 5 tích hợp còn lại vẫn thuần .env, chưa có UI sửa (ngoài phạm vi Việc 3).
const integrations = [
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
];

export default async function AdminSettingsPage() {
  await requireAdminPage();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cài đặt hệ thống"
        subtitle="Cấu hình thanh toán sửa trực tiếp bên dưới. Các tích hợp khác qua biến môi trường (.env), không sửa được trực tiếp tại đây vì lý do bảo mật."
      />

      <div>
        <SectionTitle>Cấu hình thanh toán</SectionTitle>
        <AdminPaymentConfigPanel />
      </div>

      <div>
        <SectionTitle>Tích hợp khác</SectionTitle>
        <Card padding="p-0">
          {integrations.map((i) => (
            <div key={i.name} className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--adm-border)] px-5 py-4 last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--adm-text)]">{i.name}</p>
                <p className="mt-0.5 text-xs text-[var(--adm-muted)]">{i.note}</p>
              </div>
              <StatusBadge tone={i.configured ? "success" : "warn"} dot>
                {i.configured ? "Đã cấu hình" : "Chưa cấu hình"}
              </StatusBadge>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

export const metadata = { title: "Cài đặt hệ thống — Admin Control Center — MaketMMO" };
