import { getAuthSession, getSellerForUser } from "@/lib/authz";
import { getSellerWalletSummary } from "@/lib/queries";
import SellerWithdrawPanel from "@/components/SellerWithdrawPanel";

export const dynamic = "force-dynamic";

export default async function SellerWithdrawPage() {
  const session = await getAuthSession();
  const seller = await getSellerForUser(session!.user!.id);
  const { walletBalance } = await getSellerWalletSummary(session!.user!.id, seller!.id);

  return <SellerWithdrawPanel walletBalance={walletBalance} />;
}

export const metadata = { title: "Rút tiền — Quản Lý Bán Hàng — MarketMMO" };
