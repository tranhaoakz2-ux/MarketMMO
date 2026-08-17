import { getAuthSession, getSellerForUser } from "@/lib/authz";
import SellerProfilePanel from "@/components/SellerProfilePanel";

export const dynamic = "force-dynamic";

export default async function SellerProfilePage() {
  const session = await getAuthSession();
  const seller = await getSellerForUser(session!.user!.id);

  return (
    <SellerProfilePanel
      shopName={seller!.shopName}
      avatarUrl={seller!.avatarUrl}
      coverUrl={seller!.coverUrl}
      description={seller!.description}
      specialty={seller!.specialty}
    />
  );
}

export const metadata = { title: "Hồ Sơ Cá Nhân — Quản Lý Bán Hàng — MarketMMO" };
