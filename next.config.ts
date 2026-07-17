import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Ảnh sản phẩm seller upload khi có cấu hình Vercel Blob (xem
      // saveProductImage() trong src/lib/uploads.ts) — public.blob.vercel-
      // storage.com, mỗi store Blob có 1 subdomain riêng nên cần wildcard.
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
