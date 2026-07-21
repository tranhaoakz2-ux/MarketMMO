import { getAuthSession, getSellerForUser } from "@/lib/authz";
import { getSellerReviews } from "@/lib/queries";
import SellerReviewsList from "@/components/SellerReviewsList";

export const dynamic = "force-dynamic";

export default async function SellerReviewsPage() {
  const session = await getAuthSession();
  const seller = await getSellerForUser(session!.user!.id);
  const reviews = await getSellerReviews(seller!.id);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-black text-foreground">Đánh giá</h1>
        <p className="text-xs text-muted">
          Đánh giá của người mua dành cho gian hàng của bạn (không thể chỉnh sửa/xoá).
        </p>
      </div>
      <SellerReviewsList reviews={reviews} />
    </div>
  );
}

export const metadata = { title: "Đánh giá — Quản Lý Bán Hàng — MarketMMO" };
