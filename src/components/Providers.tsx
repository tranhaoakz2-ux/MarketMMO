"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect, type ReactNode } from "react";
import { CartProvider } from "@/context/CartContext";
import { RefreshSuppressionProvider, useRefreshOnReturn } from "@/hooks/useRefreshOnReturn";

// useRefreshOnReturn() dùng useSession()/useContext -> phải là component con
// nằm TRONG SessionProvider + RefreshSuppressionProvider, không gọi thẳng
// trong Providers (component cha bọc ngoài 2 provider đó). Không render gì.
function RefreshOnReturnEffect() {
  useRefreshOnReturn();
  return null;
}

export default function Providers({ children }: { children: ReactNode }) {
  // Tắt tự khôi phục vị trí cuộn của trình duyệt khi F5/reload — App Router
  // không tự quản lý việc này như Pages Router cũ, mặc định trình duyệt tự
  // giữ nguyên scroll cũ sau reload. Set 1 lần lúc mount, trước khi có thao
  // tác điều hướng/reload nào tiếp theo trong phiên.
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  return (
    <SessionProvider>
      <RefreshSuppressionProvider>
        <RefreshOnReturnEffect />
        <CartProvider>{children}</CartProvider>
      </RefreshSuppressionProvider>
    </SessionProvider>
  );
}
