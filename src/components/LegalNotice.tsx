import { ShieldAlert } from "lucide-react";

export default function LegalNotice() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex gap-3 rounded-xl border border-brand-dark/30 bg-brand-light/40 p-4 text-xs leading-relaxed text-ink/80 sm:text-[13px]">
        <ShieldAlert className="h-5 w-5 shrink-0 text-brand-dark" />
        <p>
          <strong>TUÂN THỦ PHÁP LUẬT:</strong> Nghiêm cấm mọi hành vi sử dụng
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
