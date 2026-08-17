import { ShieldAlert } from "lucide-react";

export default function LegalNotice() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex items-start gap-3.5 rounded-2xl border border-brand-dark/30 bg-brand-light/40 p-4 shadow-sm sm:p-5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand text-ink">
          <ShieldAlert className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <p className="text-sm leading-relaxed text-ink">
          <strong className="font-black">TUÂN THỦ PHÁP LUẬT:</strong> Nghiêm cấm mọi hành vi sử dụng
          tài khoản, sản phẩm số mua tại nền tảng vào mục đích lừa đảo, giả
          mạo, hoặc vi phạm quy định pháp luật hiện hành. Hệ thống ghi nhận
          nhật ký hoạt động (IP/giao dịch) và sẵn sàng cung cấp dữ liệu phục
          vụ điều tra khi có yêu cầu từ cơ quan chức năng. Người vi phạm phải
          chịu hoàn toàn trách nhiệm trước pháp luật.
        </p>
      </div>
    </div>
  );
}
