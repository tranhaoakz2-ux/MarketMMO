import LegalPageLayout from "@/components/LegalPageLayout";

const sections = [
  {
    title: "1. Điều kiện trở thành người bán",
    body: "Người bán phải đăng ký thông tin gian hàng đầy đủ, chính xác qua trang Đăng ký bán hàng và được MarketMMO xác minh trước khi được phép đăng sản phẩm.",
  },
  {
    title: "2. Đăng sản phẩm",
    body: "Sản phẩm đăng bán phải mô tả đúng thực tế (tình trạng, độ tuổi tài khoản, chính sách bảo hành...). Nghiêm cấm đăng sản phẩm giả mạo, sản phẩm vi phạm pháp luật hoặc chính sách của nền tảng gốc (Google, Meta, Discord...).",
  },
  {
    title: "3. Ký quỹ và giải ngân",
    body: "Tiền bán hàng được giữ ký quỹ trong thời gian quy định (mặc định 3 ngày) trước khi giải ngân về ví người bán, nhằm đảm bảo thời gian xử lý khiếu nại nếu người mua gặp vấn đề.",
  },
  {
    title: "4. Phí dịch vụ",
    body: "MarketMMO thu một khoản phí dịch vụ trên mỗi giao dịch thành công. Mức phí cụ thể được thông báo trong trang quản lý gian hàng và có thể thay đổi theo chính sách từng thời kỳ.",
  },
  {
    title: "5. Xử lý tranh chấp",
    body: "Khi có khiếu nại từ người mua, người bán có trách nhiệm phản hồi trong thời gian ký quỹ. MarketMMO có quyền tạm giữ hoặc hoàn tiền nếu xác định người bán vi phạm điều khoản.",
  },
  {
    title: "6. Đình chỉ và chấm dứt hợp tác",
    body: "MarketMMO có quyền tạm ngưng hoặc chấm dứt hợp tác với gian hàng vi phạm điều khoản bán hàng, gian lận giao dịch, hoặc nhận nhiều khiếu nại có căn cứ từ người mua.",
  },
];

export default function SellingTermsPage() {
  return (
    <LegalPageLayout title="Điều khoản bán hàng" updatedAt="09/07/2026">
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
  title: "Điều khoản bán hàng — MarketMMO",
};
