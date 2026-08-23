import { getAuthSession, getSellerForUser } from "@/lib/authz";
import { getSellerWalletSummary } from "@/lib/queries";
import { getInsuranceFundTarget } from "@/lib/site-config";
import SellerInsurancePanel from "@/components/SellerInsurancePanel";

export const dynamic = "force-dynamic";

export default async function SellerInsurancePage() {
  const session = await getAuthSession();
  const seller = await getSellerForUser(session!.user!.id);
  const [{ walletBalance, insuranceBalance }, insuranceFundTarget] = await Promise.all([
    getSellerWalletSummary(session!.user!.id, seller!.id),
    getInsuranceFundTarget(),
  ]);

  return (
    <SellerInsurancePanel
      walletBalance={walletBalance}
      insuranceBalance={insuranceBalance}
      insuranceFundTarget={insuranceFundTarget}
    />
  );
}

export const metadata = { title: "Quỹ Bảo Hiểm — Quản Lý Bán Hàng — MaketMMO" };
