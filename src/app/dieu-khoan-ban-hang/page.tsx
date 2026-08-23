import LegalPageLayout from "@/components/LegalPageLayout";

const sections = [
  {
    title: "1. Điều kiện trở thành người bán",
    body: "Bất kỳ ai cũng có thể đăng ký trở thành người bán qua trang Đăng ký bán hàng — chỉ cần điền đầy đủ, chính xác thông tin gian hàng là được kích hoạt ngay. Tuy nhiên, mọi sản phẩm đăng bán đều phải qua admin kiểm duyệt trước khi hiển thị công khai trên sàn — đây là cơ chế bảo vệ người mua khỏi nội dung sai lệch hoặc vi phạm.",
  },
  {
    title: "2. Đăng sản phẩm",
    body: "Sản phẩm đăng bán phải mô tả đúng thực tế (tình trạng, độ tuổi tài khoản, chính sách bảo hành...). Nghiêm cấm đăng sản phẩm giả mạo, sản phẩm vi phạm pháp luật hoặc chính sách của nền tảng gốc (Google, Meta, Discord...). Mỗi sản phẩm mới đăng ở trạng thái chờ duyệt và chỉ hiển thị công khai sau khi admin kiểm duyệt nội dung; sản phẩm bị từ chối sẽ không hiển thị và người bán được thông báo lý do.",
  },
  {
    title: "3. Ký quỹ và giải ngân",
    body: "Tiền bán hàng được giữ ký quỹ trong thời gian quy định (mặc định 3 ngày) trước khi giải ngân về ví người bán, nhằm đảm bảo thời gian xử lý khiếu nại nếu người mua gặp vấn đề.",
  },
  {
    title: "4. Phí dịch vụ",
    body: "MaketMMO thu một khoản phí dịch vụ trên mỗi giao dịch thành công. Mức phí cụ thể được thông báo trong trang quản lý gian hàng và có thể thay đổi theo chính sách từng thời kỳ.",
  },
  {
    title: "5. Quỹ bảo hiểm gian hàng (tự nguyện)",
    body: "Người bán có thể tự nguyện nạp quỹ bảo hiểm cho gian hàng của mình — đây không phải điều kiện bắt buộc để được bán hàng trên MaketMMO. Quỹ bảo hiểm hiển thị công khai trên trang sản phẩm như một tín hiệu uy tín, giúp gian hàng tạo thêm niềm tin với người mua. Khi có khiếu nại đủ điều kiện phát sinh sau khi đơn đã giải ngân (không còn tiền ký quỹ để hoàn), MaketMMO có thể quyết định đền bù cho người mua một phần hoặc toàn bộ giá trị đơn hàng, trích từ quỹ bảo hiểm của người bán đó — số tiền đền bù không vượt quá số dư quỹ hiện có của gian hàng tại thời điểm xử lý.",
  },
  {
    title: "6. Xử lý tranh chấp",
    body: "Khi có khiếu nại từ người mua, người bán có trách nhiệm phản hồi trong thời gian ký quỹ. MaketMMO có quyền tạm giữ hoặc hoàn tiền nếu xác định người bán vi phạm điều khoản.",
  },
  {
    title: "7. Đình chỉ và chấm dứt hợp tác",
    body: "MaketMMO có quyền tạm ngưng hoặc chấm dứt hợp tác với gian hàng vi phạm điều khoản bán hàng, gian lận giao dịch, hoặc nhận nhiều khiếu nại có căn cứ từ người mua.",
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
  title: "Điều khoản bán hàng — MaketMMO",
};
