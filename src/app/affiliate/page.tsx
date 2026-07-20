import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AffiliatePanel from "@/components/AffiliatePanel";
import Breadcrumb from "@/components/Breadcrumb";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import { auth } from "@/auth";
import { getCommissionSetting } from "@/lib/commission";
import { prisma } from "@/lib/prisma";
import { ensureReferralCode } from "@/lib/referral";

export const dynamic = "force-dynamic";

export default async function AffiliatePage() {
  const session = await auth();
  if (!session?.user) redirect("/dang-nhap?callbackUrl=/affiliate");

  const referralCode = await ensureReferralCode(session.user.id);
  // % hoa hồng lấy từ cấu hình DB (admin chỉnh được) — AffiliatePanel dùng
  // dạng phân số (0.05 = 5%), nên chia 100.
  const commissionSetting = await getCommissionSetting();

  const [referrals, commissionAgg, bonusTransactions] = await Promise.all([
    prisma.user.findMany({
      where: { referredById: session.user.id },
      select: {
        id: true,
        name: true,
        username: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.walletTransaction.aggregate({
      where: {
        userId: session.user.id,
        type: "REFERRAL_BONUS",
        status: "CONFIRMED",
      },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.findMany({
      where: { userId: session.user.id, type: "REFERRAL_BONUS" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const referredIds = referrals.map((u) => u.id);
  const spendingByBuyer = referredIds.length
    ? await prisma.order.groupBy({
        by: ["buyerId"],
        where: { buyerId: { in: referredIds } },
        _sum: { totalAmount: true },
      })
    : [];
  const spendingMap = new Map(
    spendingByBuyer.map((row) => [row.buyerId, row._sum.totalAmount ?? 0])
  );

  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const referralLink = `${protocol}://${host}/dang-nhap?ref=${referralCode}`;

  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Affiliate" }]} />
        </div>

        <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
          <Reveal>
            <AffiliatePanel
              referralLink={referralLink}
              totalCommission={commissionAgg._sum.amount ?? 0}
              commissionPercent={commissionSetting.commissionPercent / 100}
              referredUsers={referrals.map((u) => ({
                id: u.id,
                name: u.name ?? u.username ?? "Người dùng",
                createdAt: u.createdAt.toISOString(),
                totalSpent: spendingMap.get(u.id) ?? 0,
              }))}
              bonusHistory={bonusTransactions.map((t) => ({
                id: t.id,
                amount: t.amount,
                status: t.status,
                createdAt: t.createdAt.toISOString(),
              }))}
            />
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  );
}

export const metadata = {
  title: "Chương Trình Giới Thiệu — MarketMMO",
};
