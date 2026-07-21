import LegalPageLayout from "@/components/LegalPageLayout";

const sections = [
  {
    title: "1. Chấp nhận điều khoản",
    body: "Khi truy cập và sử dụng MarketMMO.PRO, bạn đồng ý tuân thủ toàn bộ điều khoản dịch vụ này cùng các chính sách liên quan (Chính sách bảo mật, Điều khoản bán hàng). Nếu không đồng ý, vui lòng ngừng sử dụng nền tảng.",
  },
  {
    title: "2. Tài khoản người dùng",
    body: "Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động diễn ra dưới tài khoản của mình. Vui lòng thông báo ngay cho chúng tôi nếu phát hiện truy cập trái phép.",
  },
  {
    title: "3. Giao dịch và ký quỹ",
    body: "Mọi giao dịch mua bán trên nền tảng được thực hiện qua ví nội bộ và cơ chế ký quỹ. Tiền hàng được giữ ký quỹ trong thời gian quy định trước khi giải ngân cho người bán, nhằm bảo vệ quyền lợi của cả hai bên.",
  },
  {
    title: "4. Hành vi bị nghiêm cấm",
    body: "Nghiêm cấm mọi hành vi sử dụng tài khoản, sản phẩm số giao dịch trên nền tảng vào mục đích lừa đảo, giả mạo, rửa tiền hoặc vi phạm pháp luật hiện hành, bao gồm nhưng không giới hạn ở Nghị định 147/2024/NĐ-CP và Luật An ninh mạng. Hệ thống ghi nhận nhật ký hoạt động (IP/giao dịch) và sẵn sàng cung cấp dữ liệu phục vụ điều tra khi có yêu cầu từ cơ quan chức năng.",
  },
  {
    title: "5. Giới hạn trách nhiệm",
    body: "MarketMMO đóng vai trò trung gian kết nối người mua và người bán, không chịu trách nhiệm về chất lượng nội dung, tính hợp pháp của cách sử dụng sản phẩm sau khi giao dịch hoàn tất, ngoại trừ các cam kết bảo hành được nêu rõ trong từng sản phẩm.",
  },
  {
    title: "6. Thay đổi điều khoản",
    body: "Chúng tôi có thể cập nhật điều khoản dịch vụ theo thời gian. Phiên bản mới nhất luôn được đăng tải tại trang này và có hiệu lực ngay khi công bố.",
  },
];

export default function TermsOfServicePage() {
  return (
    <LegalPageLayout title="Điều khoản dịch vụ" updatedAt="09/07/2026">
      {sections.map((s) => (
        <section key={s.title}>
          <h2 className="mb-2 text-base font-bold text-foreground">{s.title}</h2>
          <p>{s.body}</p>
        </section>
      ))}
    </LegalPageLayout>
  );
}

export const metadata = {
  title: "Điều khoản dịch vụ — MarketMMO",
};
