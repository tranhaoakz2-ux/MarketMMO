import AuthForms from "@/components/AuthForms";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Reveal from "@/components/Reveal";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; ref?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/";
  const googleEnabled = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
  );
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-md px-4 py-8 sm:px-6 lg:px-8">
          <Reveal>
            <div className="overflow-hidden rounded-2xl border border-border-c bg-surface shadow-sm">
              <AuthForms
                googleEnabled={googleEnabled}
                turnstileSiteKey={turnstileSiteKey}
                callbackUrl={callbackUrl}
                defaultRefCode={params.ref?.toUpperCase()}
                initialTab={params.tab === "register" ? "register" : "login"}
              />
            </div>
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  );
}

export const metadata = {
  title: "Đăng nhập / Đăng ký — MarketMMO",
};
