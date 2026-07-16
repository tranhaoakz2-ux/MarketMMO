import LegalPageLayout from "@/components/LegalPageLayout";

const faqs = [
  {
    q: "MarketMMO hoạt động theo mô hình nào?",
    a: "MarketMMO là sàn giao dịch marketplace multi-vendor — nhiều người bán độc lập đăng sản phẩm/dịch vụ số (tài khoản, vật phẩm MMO, dịch vụ boosting), người mua thanh toán qua ví nội bộ và nhận hàng tự động ngay sau khi giao dịch hoàn tất.",
  },
  {
    q: "Ký quỹ (escrow) hoạt động như thế nào?",
    a: "Sau khi bạn thanh toán, tiền được giữ ký quỹ trên hệ thống trong một khoảng thời gian (thường 3 ngày) trước khi giải ngân cho người bán. Nếu có tranh chấp trong thời gian này, bạn có thể khiếu nại để được hỗ trợ xử lý.",
  },
  {
    q: "Làm sao để nạp tiền vào ví?",
    a: "Vào mục Nạp tiền, chọn phương thức (chuyển khoản QR/ngân hàng, ví Momo/ZaloPay, thẻ cào, chuyển khoản doanh nghiệp) và số tiền muốn nạp. Số dư ví dùng để mua sản phẩm ngay lập tức, không cần thanh toán lại cho từng đơn.",
  },
  {
    q: "Sản phẩm có được bảo hành không?",
    a: "Từng sản phẩm có chính sách bảo hành riêng do người bán công bố (hiển thị trong phần thuộc tính/mô tả sản phẩm). Hãy đọc kỹ trước khi mua và liên hệ người bán ngay nếu sản phẩm gặp lỗi trong thời gian bảo hành.",
  },
  {
    q: "Làm sao để trở thành người bán trên MarketMMO?",
    a: "Truy cập trang Đăng ký bán hàng, điền thông tin gian hàng và gửi đăng ký. Sau khi được duyệt, bạn có thể đăng sản phẩm, quản lý đơn hàng và nhận thanh toán qua ví.",
  },
  {
    q: "Giao dịch trên MarketMMO có an toàn không?",
    a: "Mọi giao dịch được ký quỹ và ghi nhận nhật ký hoạt động. Chúng tôi nghiêm cấm sử dụng tài khoản/sản phẩm giao dịch trên sàn vào mục đích lừa đảo, giả mạo hoặc vi phạm pháp luật — xem chi tiết tại Điều khoản dịch vụ.",
  },
];

export default function FaqPage() {
  return (
    <LegalPageLayout title="Câu hỏi thường gặp">
      <div className="flex flex-col gap-3">
        {faqs.map((item) => (
          <details
            key={item.q}
            className="group rounded-xl border border-border-c bg-surface-alt p-4 open:bg-brand-light/30"
          >
            <summary className="cursor-pointer list-none text-sm font-bold text-ink marker:content-none">
              {item.q}
            </summary>
            <p className="mt-2 text-sm text-ink/70">{item.a}</p>
          </details>
        ))}
      </div>
    </LegalPageLayout>
  );
}

export const metadata = {
  title: "Câu hỏi thường gặp — MarketMMO",
};
