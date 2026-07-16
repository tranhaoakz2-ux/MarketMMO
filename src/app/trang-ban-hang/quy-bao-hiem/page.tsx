import { getAuthSession, getSellerForUser } from "@/lib/authz";
import { getSellerWalletSummary } from "@/lib/queries";
import SellerInsurancePanel from "@/components/SellerInsurancePanel";

export const dynamic = "force-dynamic";

export default async function SellerInsurancePage() {
  const session = await getAuthSession();
  const seller = await getSellerForUser(session!.user!.id);
  const { walletBalance, insuranceBalance } = await getSellerWalletSummary(
    session!.user!.id,
    seller!.id
  );

  return <SellerInsurancePanel walletBalance={walletBalance} insuranceBalance={insuranceBalance} />;
}

export const metadata = { title: "Quỹ bảo hiểm — Quản Lý Bán Hàng — MarketMMO" };
