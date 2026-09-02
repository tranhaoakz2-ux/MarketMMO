import { redirect } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";
import UserProfilePanel from "@/components/UserProfilePanel";
import { getAuthSession } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function UserProfilePage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/dang-nhap?callbackUrl=/ho-so-ca-nhan");

  // Session chỉ mang id/name/email/role/walletBalance/banned (xem callback
  // session() trong src/auth.ts) — query lại đầy đủ để có phone/username/
  // createdAt/image/referralCode/passwordHash (chỉ dùng passwordHash để suy
  // ra hasPassword, KHÔNG truyền hash ra client).
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      username: true,
      phone: true,
      image: true,
      passwordHash: true,
      createdAt: true,
      walletBalance: true,
      role: true,
      referralCode: true,
      memberCode: true,
    },
  });
  if (!user) redirect("/dang-nhap?callbackUrl=/ho-so-ca-nhan");

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Hồ sơ cá nhân" }]} />
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
          <Reveal>
            <UserProfilePanel
              name={user.name ?? ""}
              email={user.email}
              username={user.username}
              phone={user.phone}
              avatarUrl={user.image}
              hasPassword={Boolean(user.passwordHash)}
              createdAt={user.createdAt.toISOString()}
              walletBalance={user.walletBalance}
              role={user.role as "BUYER" | "SELLER" | "ADMIN"}
              referralCode={user.referralCode}
              memberCode={user.memberCode}
            />
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  );
}

export const metadata = {
  title: "Hồ sơ cá nhân — MaketMMO",
  robots: PRIVATE_ROBOTS,
};
