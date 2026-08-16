import type { Metadata } from "next";
import { PRIVATE_ROBOTS } from "@/lib/seo";

// page.tsx trong thư mục này là Client Component ("use client", cần state
// cho tương tác giỏ hàng) — Next.js không cho phép Client Component export
// `metadata`. Dùng layout.tsx (Server Component) làm nơi đặt metadata thay
// thế, không đụng vào page.tsx hiện có.
export const metadata: Metadata = {
  title: "Giỏ hàng — MarketMMO",
  robots: PRIVATE_ROBOTS,
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
