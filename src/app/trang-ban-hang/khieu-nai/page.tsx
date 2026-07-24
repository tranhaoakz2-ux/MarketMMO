import { getAuthSession, getSellerForUser } from "@/lib/authz";
import { getSellerDisputes } from "@/lib/queries";
import SellerDisputesList from "@/components/SellerDisputesList";

export const dynamic = "force-dynamic";

export default async function SellerDisputesPage() {
  const session = await getAuthSession();
  const seller = await getSellerForUser(session!.user!.id);
  const disputes = await getSellerDisputes(seller!.id);

  return <SellerDisputesList disputes={disputes} />;
}

export const metadata = { title: "Khiếu nại — Quản Lý Bán Hàng — MarketMMO" };
