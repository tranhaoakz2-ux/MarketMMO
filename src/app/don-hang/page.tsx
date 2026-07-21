import { PackageSearch } from "lucide-react";
import { redirect } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import DeliveredPayloadButton from "@/components/DeliveredPayloadButton";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import OpenDisputeButton from "@/components/OpenDisputeButton";
import Reveal from "@/components/Reveal";
import { auth } from "@/auth";
import { orderStatusLabel, type OrderStatus } from "@/lib/constants";
import { formatVnd } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusStyle: Record<OrderStatus, string> = {
  ESCROW: "bg-brand-light text-brand-dark",
  RELEASED: "bg-success/10 text-success",
  CANCELLED: "bg-danger/10 text-danger",
  DISPUTED: "bg-danger/10 text-danger",
};

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/dang-nhap?callbackUrl=/don-hang");

  const orders = await prisma.order.findMany({
    where: { buyerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      items: { include: { product: { include: { seller: true } }, dispute: true } },
    },
  });

  const rows = orders.flatMap((order) =>
    order.items.map((item) => ({
      orderId: order.id,
      itemId: item.id,
      productName: item.productName,
      variantLabel: item.variantLabel,
      seller: item.product?.seller.shopName ?? "—",
      createdAt: order.createdAt,
      total: item.price * item.quantity,
      status: item.status as OrderStatus,
      escrowReleaseAt: item.escrowReleaseAt,
      hasDispute: Boolean(item.dispute),
      deliveredPayload: item.deliveredPayload,
    }))
  );

  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Đơn hàng" }]} />
        </div>

        <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
          <Reveal>
            <h1 className="mb-4 flex items-center gap-2 text-xl font-black text-foreground">
              <PackageSearch className="h-5 w-5" /> Lịch sử đơn hàng
            </h1>
          </Reveal>

          <Reveal delay={0.1}>
            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-c bg-surface p-12 text-center text-sm text-muted">
                Bạn chưa có đơn hàng nào.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border-c bg-surface shadow-sm">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border-c bg-surface-alt text-xs font-bold text-muted">
                      <th className="px-4 py-3">Mã đơn</th>
                      <th className="px-4 py-3">Sản phẩm</th>
                      <th className="px-4 py-3">Người bán</th>
                      <th className="px-4 py-3">Thời gian</th>
                      <th className="px-4 py-3">Thành tiền</th>
                      <th className="px-4 py-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.itemId}
                        className="border-b border-border-c last:border-0 hover:bg-surface-alt"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-muted">
                          {row.orderId.slice(-8).toUpperCase()}
                        </td>
                        <td className="max-w-[220px] px-4 py-3">
                          <p className="truncate font-semibold text-foreground">{row.productName}</p>
                          {row.variantLabel && (
                            <p className="truncate text-xs text-brand-dark">{row.variantLabel}</p>
                          )}
                          {row.deliveredPayload && (
                            <DeliveredPayloadButton deliveredPayload={row.deliveredPayload} />
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted">{row.seller}</td>
                        <td className="px-4 py-3 text-muted">
                          {row.createdAt.toLocaleString("vi-VN")}
                        </td>
                        <td className="px-4 py-3 font-bold text-danger">
                          {formatVnd(row.total)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle[row.status]}`}
                          >
                            {orderStatusLabel[row.status]}
                          </span>
                          {row.status === "ESCROW" && (
                            <>
                              <p className="mt-1 text-[10px] text-muted">
                                Giải ngân: {row.escrowReleaseAt.toLocaleDateString("vi-VN")}
                              </p>
                              {!row.hasDispute && <OpenDisputeButton orderItemId={row.itemId} />}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  );
}

export const metadata = {
  title: "Lịch sử đơn hàng — MarketMMO",
};
