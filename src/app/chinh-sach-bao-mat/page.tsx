import LegalPageLayout from "@/components/LegalPageLayout";

const sections = [
  {
    title: "1. Thông tin chúng tôi thu thập",
    body: "MarketMMO thu thập thông tin tài khoản (tên đăng nhập, email, số điện thoại), dữ liệu giao dịch (đơn hàng, lịch sử nạp tiền), và dữ liệu kỹ thuật (địa chỉ IP, thiết bị, thời gian truy cập) nhằm vận hành và bảo vệ nền tảng.",
  },
  {
    title: "2. Mục đích sử dụng",
    body: "Thông tin được sử dụng để xử lý giao dịch, xác minh danh tính, ngăn chặn gian lận, hỗ trợ khách hàng, và tuân thủ nghĩa vụ pháp lý khi có yêu cầu từ cơ quan chức năng có thẩm quyền.",
  },
  {
    title: "3. Chia sẻ thông tin",
    body: "Chúng tôi không bán thông tin cá nhân của bạn cho bên thứ ba. Thông tin chỉ được chia sẻ với đối tác thanh toán để xử lý giao dịch, hoặc cung cấp cho cơ quan chức năng khi có yêu cầu hợp pháp.",
  },
  {
    title: "4. Bảo mật dữ liệu",
    body: "MarketMMO áp dụng các biện pháp kỹ thuật và quản lý phù hợp để bảo vệ dữ liệu người dùng khỏi truy cập, sử dụng hoặc tiết lộ trái phép.",
  },
  {
    title: "5. Quyền của người dùng",
    body: "Bạn có quyền yêu cầu truy cập, chỉnh sửa hoặc xoá thông tin cá nhân của mình, trừ các dữ liệu cần lưu giữ để tuân thủ nghĩa vụ pháp lý hoặc giải quyết tranh chấp đang diễn ra.",
  },
  {
    title: "6. Lưu trữ nhật ký hoạt động",
    body: "Theo quy định pháp luật hiện hành, hệ thống ghi nhận và lưu trữ nhật ký hoạt động (IP, giao dịch) trong thời gian bắt buộc để sẵn sàng cung cấp khi cơ quan chức năng yêu cầu phục vụ điều tra.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Chính sách bảo mật" updatedAt="09/07/2026">
      {sections.map((s) => (
        <section key={s.title}>
          <h2 className="mb-2 text-base font-bold text-ink">{s.title}</h2>
          <p>{s.body}</p>
        </section>
      ))}
    </LegalPageLayout>
  );
}

export const metadata = {
  title: "Chính sách bảo mật — MarketMMO",
};
