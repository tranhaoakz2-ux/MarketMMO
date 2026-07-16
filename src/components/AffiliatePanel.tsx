"use client";

import {
  Check,
  Copy,
  Handshake,
  History,
  Percent,
  ShoppingBag,
  Sprout,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatVnd } from "@/lib/format";

type ReferredUser = {
  id: string;
  name: string;
  createdAt: string;
  totalSpent: number;
};

type BonusTx = {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
};

const steps = [
  {
    icon: UserPlus,
    title: "1. Mời bạn bè",
    desc: "Chia sẻ liên kết của bạn với bạn bè hoặc trên mạng xã hội.",
  },
  {
    icon: ShoppingBag,
    title: "2. Họ mua hàng",
    desc: "Khi họ đăng ký qua link và mua sản phẩm bất kỳ.",
  },
  {
    icon: Percent,
    title: "3. Nhận Hoa Hồng",
    desc: "Tự động nhận tiền hoa hồng mỗi khi bạn bè mua hàng!",
  },
];

export default function AffiliatePanel({
  referralLink,
  totalCommission,
  referredUsers,
  bonusHistory,
  commissionPercent,
}: {
  referralLink: string;
  totalCommission: number;
  referredUsers: ReferredUser[];
  bonusHistory: BonusTx[];
  commissionPercent: number;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-[1240px]">
      {/* Hero */}
      <div className="rounded-2xl bg-brand px-6 py-8 text-center sm:px-10 sm:py-10">
        <h1 className="flex items-center justify-center gap-2 text-2xl font-black uppercase tracking-tight text-ink sm:text-4xl">
          <Handshake className="h-7 w-7 shrink-0 sm:h-9 sm:w-9" /> Chương Trình Giới Thiệu
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm font-medium text-ink/80 sm:text-base">
          Mời bạn bè đăng ký và nhận hoa hồng hấp dẫn từ mỗi đơn hàng của họ — thu nhập
          không giới hạn!
        </p>

        <div className="mx-auto mt-6 flex max-w-2xl flex-col items-stretch gap-2 rounded-xl bg-surface p-2 sm:flex-row sm:items-center sm:gap-3 sm:p-2.5">
          <span className="flex min-w-0 flex-1 items-center gap-2 px-2 text-left">
            <span className="shrink-0 text-sm font-bold text-ink/60">LINK:</span>
            <span className="truncate font-mono text-sm text-ink sm:text-base">
              {referralLink}
            </span>
          </span>
          <button
            onClick={copy}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-ink px-4 py-2.5 text-sm font-bold text-white transition hover:bg-ink-soft"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Đã sao chép" : "Copy"}
          </button>
        </div>
      </div>

      {/* 3 steps */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.title}
            className="rounded-2xl border-2 border-brand bg-surface p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-dark hover:shadow-[0_12px_28px_rgba(111,168,46,0.25),0_4px_10px_rgba(0,0,0,0.05)]"
          >
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-brand-light/50">
              <step.icon className="h-6 w-6 text-brand-dark" />
            </div>
            <h3 className="text-lg font-bold text-ink">{step.title}</h3>
            <p className="mt-1 text-sm text-muted">{step.desc}</p>
          </div>
        ))}
      </div>

      {/* Danh sách giới thiệu */}
      <div className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-ink">
          <Users className="h-5 w-5 text-brand-dark" /> Danh sách giới thiệu
        </h2>

        <div className="flex flex-col gap-4 rounded-2xl border-2 border-brand bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-light/50">
              <Wallet className="h-5 w-5 text-brand-dark" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted">
                Tổng hoa hồng đã nhận
              </p>
              <p className="text-3xl font-black text-success sm:text-4xl">
                {formatVnd(totalCommission)}
              </p>
            </div>
          </div>

          <Link
            href="/nap-tien"
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-ink px-4 py-2.5 text-sm font-bold text-white transition hover:bg-ink-soft"
          >
            <Wallet className="h-4 w-4" /> Xem Lịch Sử Ví
          </Link>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-border-c bg-surface shadow-sm">
          <div className="hidden grid-cols-4 gap-2 border-b border-border-c px-5 py-3 text-sm font-bold text-ink sm:grid">
            <span>Tên người dùng</span>
            <span>Ngày tham gia</span>
            <span>Tổng chi tiêu</span>
            <span>Hoa hồng (Ước tính)</span>
          </div>

          {referredUsers.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center">
              <Sprout className="h-10 w-10 text-border-c" />
              <p className="font-semibold text-ink">Bạn chưa giới thiệu được ai.</p>
              <p className="text-sm text-muted">
                Hãy copy link giới thiệu phía trên và gửi cho bạn bè ngay!
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {referredUsers.map((u) => (
                <div
                  key={u.id}
                  className="grid grid-cols-2 gap-2 border-b border-dashed border-border-c px-5 py-3 text-sm last:border-b-0 sm:grid-cols-4"
                >
                  <span className="font-semibold text-ink">{u.name}</span>
                  <span className="text-muted">
                    {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                  </span>
                  <span className="text-ink">{formatVnd(u.totalSpent)}</span>
                  <span>
                    {u.totalSpent > 0 ? (
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-bold text-success">
                        ~{formatVnd(Math.round(u.totalSpent * commissionPercent))}
                      </span>
                    ) : (
                      <span className="rounded-full bg-surface-alt px-2 py-0.5 text-xs font-bold text-muted">
                        Chưa phát sinh
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lịch sử hoa hồng */}
      <div className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-ink">
          <History className="h-5 w-5 text-brand-dark" /> Lịch sử hoa hồng
        </h2>

        <div className="overflow-hidden rounded-2xl border border-border-c bg-surface shadow-sm">
          <div className="hidden grid-cols-3 gap-2 border-b border-border-c px-5 py-3 text-sm font-bold text-ink sm:grid">
            <span>Thời gian</span>
            <span>Số tiền</span>
            <span>Trạng thái</span>
          </div>

          {bonusHistory.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted">
              Chưa có lịch sử hoa hồng.
            </div>
          ) : (
            <div className="flex max-h-[900px] flex-col overflow-y-auto">
              {bonusHistory.map((t) => (
                <div
                  key={t.id}
                  className="grid grid-cols-2 gap-2 border-b border-dashed border-border-c px-5 py-3 text-sm last:border-b-0 sm:grid-cols-3"
                >
                  <span className="text-muted">
                    {new Date(t.createdAt).toLocaleString("vi-VN")}
                  </span>
                  <span className="font-bold text-success">+{formatVnd(t.amount)}</span>
                  <span>
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-bold text-success">
                      Đã cộng ví
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        Bạn nhận {(commissionPercent * 100).toFixed(0)}% giá trị mỗi đơn hàng mà người
        được mời mua, sau khi họ đã nạp tiền thật vào ví.
      </p>
    </div>
  );
}
