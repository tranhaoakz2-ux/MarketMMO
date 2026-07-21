import { Banknote, Gift, Lock, ShieldCheck, TrendingDown, Wallet } from "lucide-react";
import { requireAdminPage } from "@/lib/authz";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import { getAdminFinancialHealth } from "@/lib/queries";
import { formatVnd } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminFinancialHealthPage() {
  await requireAdminPage();
  const h = await getAdminFinancialHealth();

  const cards = [
    { icon: Wallet, label: "Tổng số dư ví người dùng", value: h.totalWalletBalance, note: "Nợ phải trả của nền tảng — tiền user có thể rút/tiêu bất kỳ lúc nào" },
    { icon: Lock, label: "Đang ký quỹ (ESCROW)", value: h.escrowTotal, note: "Tiền buyer đã trả, chưa giải ngân cho seller" },
    { icon: ShieldCheck, label: "Tổng quỹ bảo hiểm seller", value: h.totalInsuranceBalance, note: "Seller tự nguyện đóng, tín hiệu tin cậy" },
    { icon: Banknote, label: "Đã giải ngân (RELEASED)", value: h.releasedTotal, note: "Tổng tiền đã trả cho seller từ trước tới nay" },
    { icon: Gift, label: "Tổng hoa hồng affiliate đã trả", value: h.totalReferralPaid, note: "WalletTransaction loại REFERRAL_BONUS, đã CONFIRMED" },
    { icon: TrendingDown, label: "Tổng đã rút (WITHDRAW)", value: h.totalWithdrawn, note: "Seller đã rút thành công từ trước tới nay" },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Sức khoẻ tài chính"
        sub="Tổng hợp số dư toàn hệ thống tại thời điểm hiện tại — dùng để đối chiếu dòng tiền, không thay thế sổ sách kế toán chính thức."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5 shadow-sm">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--adm-brand-dim)] text-[var(--adm-brand)]">
              <c.icon className="h-4.5 w-4.5" />
            </span>
            <p className="mt-3 text-xs font-semibold text-[var(--adm-muted)]">{c.label}</p>
            <p className="mt-0.5 text-xl font-black text-[var(--adm-text)]">{formatVnd(c.value)}</p>
            <p className="mt-2 text-[11px] text-[var(--adm-muted)]">{c.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export const metadata = { title: "Sức khoẻ tài chính — Admin Control Center — MarketMMO" };
