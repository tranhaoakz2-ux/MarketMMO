import { getAuthSession, getSellerForUser } from "@/lib/authz";
import { getSellerReviews } from "@/lib/queries";
import SellerReviewsList from "@/components/SellerReviewsList";

export const dynamic = "force-dynamic";

export default async function SellerReviewsPage() {
  const session = await getAuthSession();
  const seller = await getSellerForUser(session!.user!.id);
  const reviews = await getSellerReviews(seller!.id);

  return <SellerReviewsList reviews={reviews} />;
}

export const metadata = { title: "Đánh giá — Quản Lý Bán Hàng — MarketMMO" };
