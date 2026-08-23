// Nội dung + hành vi của popup chào mừng (WelcomeModal.tsx) — tập trung ở
// đây để dễ sửa link/số liệu thật sau này mà không phải đụng vào logic
// component. Icon trong `features` phải là 1 trong các key khai báo trong
// WELCOME_MODAL_ICONS (WelcomeModal.tsx).

export const WELCOME_MODAL_CONFIG = {
  // Tăng số này lên 1 đơn vị để "reset" popup cho MỌI khách — kể cả người
  // đã từng bấm đóng trước đó sẽ thấy lại popup ở lần tải trang kế tiếp, vì
  // key lưu trong localStorage đổi theo version nên bản ghi "đã đóng" ứng
  // với version cũ không còn khớp key mới nữa (xem WELCOME_MODAL_STORAGE_KEY
  // trong WelcomeModal.tsx). Dùng khi có chiến dịch/thông báo mới cần mọi
  // người đều thấy lại, hoặc khi đổi nội dung popup đủ lớn.
  version: 1,

  // Sau khi khách tự đóng popup, số ngày tối thiểu trước khi popup được
  // phép tự hiện lại cho CHÍNH khách đó ở một lượt ghé thăm sau. Đặt 0 để
  // không bao giờ tự hiện lại (chỉ hiện lại khi bạn tăng `version` ở trên).
  reshowAfterDays: 7,

  // Độ trễ (ms) trước khi popup tự hiện sau khi trang tải xong — tạo cảm
  // giác mượt hơn hiện ngay lập tức, không phải chặn tương tác của khách.
  autoOpenDelayMs: 500,

  brandName: "MaketMMO",
  // Dòng nhỏ, viết hoa, phía trên tiêu đề — nhấn định vị thương hiệu trước
  // khi vào lời chào. Để trống ("") nếu không muốn hiện dòng này.
  eyebrow: "SÀN GIAO DỊCH SỐ UY TÍN",
  // Tiêu đề cố ý tách 2 dòng riêng biệt (không phải 1 câu dài để trình duyệt
  // tự xuống dòng): dòng 1 là lời chào, dòng 2 LUÔN là `brandName` ở trên,
  // hiển thị dạng chip nền vàng thương hiệu để nổi bật + đảm bảo tương phản
  // tốt ở cả nền sáng lẫn tối (xem WelcomeModal.tsx — chữ vàng thuần trên
  // nền trắng sẽ khó đọc nên dùng chip nền vàng + chữ tối thay vì chữ vàng
  // trực tiếp).
  titleLine1: "Chào mừng đến với",
  subtitle:
    "Mọi giao dịch đều được ký quỹ và bảo vệ, giao hàng tự động 24/7.",

  features: [
    {
      icon: "ShieldCheck",
      title: "Ký quỹ an toàn",
      description: "Tiền giữ ký quỹ đến khi giao dịch hoàn tất, không lo mất tiền oan.",
    },
    {
      icon: "Zap",
      title: "Giao dịch tự động 24/7",
      description: "Đặt hàng và nhận hàng ngay, không cần chờ duyệt thủ công.",
    },
    {
      icon: "Scale",
      title: "Bảo vệ người mua",
      description: "Có khiếu nại/bảo hành rõ ràng — sàn đứng ra xử lý khi phát sinh tranh chấp.",
    },
    {
      icon: "Headphones",
      title: "Hỗ trợ tận tâm",
      description: "Đội ngũ phản hồi nhanh qua chat, Fanpage và Telegram.",
    },
  ] as const,

  // TODO: điền link Fanpage thật khi có — hiện là placeholder "#" nên nút
  // vẫn hiện đầy đủ nhưng bấm vào không đi đâu cả.
  fanpageUrl: "#",
  telegramUrl: "https://t.me/Ad_marketmmo",

  ctaLabel: "Khám phá ngay",
};
