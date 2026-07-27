import Footer from "@/components/Footer";
import Header from "@/components/Header";
import WelcomeModalPreview from "./WelcomeModalPreview";

// Trang XEM TRƯỚC popup chào mừng — CHƯA gắn vào trang chủ thật (/). Dùng
// đúng Header/Footer thật của site để bạn thấy popup trông thế nào trong bối
// cảnh thật, nhưng nội dung chính giữa chỉ là placeholder mô tả, không fetch
// dữ liệu DB. Sau khi duyệt, WelcomeModal chỉ cần mount thêm 1 dòng
// `<WelcomeModal />` vào src/app/page.tsx (trang chủ thật) là xong — không
// cần đụng gì ở đây nữa.
export default function WelcomeModalDemoPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <h1 className="text-2xl font-black text-foreground sm:text-3xl">
            Demo: Popup chào mừng
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
            Đây là trang xem trước popup &quot;Chào mừng đến với MarketMMO&quot;. Popup sẽ tự
            hiện bên dưới sau khoảng nửa giây — đúng hành vi dự kiến khi khách vào trang
            chủ lần đầu. Header/Footer trên trang này là component thật của site, chỉ phần
            nội dung giữa trang là placeholder cho trang demo.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
            Đóng popup rồi tải lại trang (F5) để kiểm chứng: popup sẽ{" "}
            <b className="text-foreground">không hiện lại</b> — đúng hành vi &quot;chỉ hiện 1
            lần&quot;. Dùng bảng điều khiển ở góc dưới trái để xoá trạng thái đã đóng và xem
            lại ngay mà không cần xoá localStorage bằng tay.
          </p>
        </div>
      </main>
      <Footer />
      <WelcomeModalPreview />
    </>
  );
}
