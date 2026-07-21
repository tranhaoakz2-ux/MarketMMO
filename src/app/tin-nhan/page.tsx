import { MessageCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Breadcrumb from "@/components/Breadcrumb";
import ChatInbox from "@/components/ChatInbox";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import { getAuthSession } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/dang-nhap?callbackUrl=/tin-nhan");

  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Tin nhắn" }]} />
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <Reveal>
            <h1 className="mb-4 flex items-center gap-2 text-xl font-black text-foreground">
              <MessageCircle className="h-5 w-5" /> Tin nhắn
            </h1>
            <Suspense fallback={<p className="text-sm text-muted">Đang tải...</p>}>
              <ChatInbox />
            </Suspense>
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  );
}

export const metadata = { title: "Tin nhắn — MarketMMO" };
