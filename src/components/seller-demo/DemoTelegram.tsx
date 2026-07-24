import { CheckCircle2, Send, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  Field,
  PageHeader,
  SectionTitle,
  StatusBadge,
  TextInput,
} from "@/components/seller-demo/DemoKit";

const STEPS = [
  "Mở Telegram, tìm bot @userinfobot và bấm Start để lấy Chat ID của bạn.",
  "Nhập Chat ID vào ô bên dưới rồi bấm Liên kết — hệ thống gửi mã 6 số tới Telegram.",
  "Nhập lại mã 6 số để xác nhận đúng là tài khoản của bạn.",
];

export default function DemoTelegram() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Telegram Bot"
        subtitle="Liên kết Telegram để nhận thông báo đơn mới, khiếu nại, giải ngân... từ MarketMMO."
      />

      {/* Trạng thái đã liên kết (ví dụ) */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-success/10 text-success">
              <CheckCircle2 className="h-6 w-6" strokeWidth={2} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-foreground">Đã liên kết Telegram</p>
                <StatusBadge tone="success" dot>Đang hoạt động</StatusBadge>
              </div>
              <p className="text-xs text-muted">
                Chat ID <span className="font-mono font-bold text-foreground">1902xxxx87</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm"><Send className="h-3.5 w-3.5" /> Gửi tin thử</Button>
            <Button variant="danger" size="sm"><Trash2 className="h-3.5 w-3.5" /> Huỷ liên kết</Button>
          </div>
        </div>
      </Card>

      {/* Hướng dẫn liên kết (khi chưa liên kết) */}
      <Card>
        <SectionTitle>Cách liên kết (khi chưa kết nối)</SectionTitle>
        <ul className="flex flex-col gap-3">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-start gap-2.5 text-sm text-foreground/80">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-white">
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Chat ID (chỉ số)">
              <TextInput placeholder="VD: 190287xxxx" />
            </Field>
          </div>
          <Button className="shrink-0"><Send className="h-4 w-4" /> Liên kết</Button>
        </div>
      </Card>
    </div>
  );
}
