import { PackageSearch } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import CancelPreOrderButton from "@/components/CancelPreOrderButton";
import CopyOrderCodeButton from "@/components/CopyOrderCodeButton";
import DeliveredPayloadButton from "@/components/DeliveredPayloadButton";
import DisputeStatusCell from "@/components/DisputeStatusCell";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import OpenDisputeButton from "@/components/OpenDisputeButton";
import OrderStatusTimeline from "@/components/OrderStatusTimeline";
import PostReleaseDisputeStatus from "@/components/PostReleaseDisputeStatus";
import ProductThumbnail from "@/components/ProductThumbnail";
import Reveal from "@/components/Reveal";
import { auth } from "@/auth";
import { orderStatusLabel, type DisputeStatus, type OrderStatus } from "@/lib/constants";
import { formatVnd } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { formatWarrantyRemaining, warrantyRemaining } from "@/lib/warranty";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export const dynamic = "force-dynamic";

const statusStyle: Record<OrderStatus, string> = {
  ESCROW: "border-brand-dark/30 bg-brand-light/40 text-brand-dark",
  RELEASED: "border-success/30 bg-success/10 text-success",
  CANCELLED: "border-danger/30 bg-danger/10 text-danger",
  DISPUTED: "border-danger/30 bg-danger/10 text-danger",
};

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/dang-nhap?callbackUrl=/don-hang");

  // CHỈ select đúng field trang này cần hiển thị — KHÔNG dùng `include`
  // (vốn kéo TOÀN BỘ scalar của OrderItem, gồm cả `deliveredPayloadEncryption`
  // không cần thiết ở đây) — cùng nguyên tắc đã áp dụng ở GET /api/admin/disputes.
  // `deliveredPayload` VẪN phải select vì cần đọc để suy ra boolean
  // `hasDeliveredPayload` bên dưới, nhưng GIÁ TRỊ THẬT của nó không bao giờ
  // được đưa vào `rows`/JSX — nội dung thật CHỈ rời server qua đúng 1 route
  // POST /api/orders/[orderItemId]/reveal-delivered khi buyer chủ động bấm.
  const orders = await prisma.order.findMany({
    where: { buyerId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderCode: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          productName: true,
          variantLabel: true,
          price: true,
          quantity: true,
          status: true,
          escrowReleaseAt: true,
          warrantyHours: true,
          receivedAt: true,
          warrantyExpiresAt: true,
          releasedAt: true,
          deliveredPayload: true,
          isPreOrder: true,
          deliveryDeadline: true,
          product: {
            select: {
              productType: true,
              // Chỉ lấy ẢNH THUMBNAIL công khai (imageUrl) + slug category để
              // fallback icon — giống hệt cách giỏ hàng đang hiển thị ảnh sản
              // phẩm (ProductThumbnail.tsx). KHÔNG liên quan/không ảnh hưởng
              // tới deliveredPayload (nội dung giao hàng) vẫn chỉ lộ qua đúng
              // route reveal-delivered như cũ.
              imageUrl: true,
              category: { select: { slug: true } },
              seller: { select: { shopName: true } },
            },
          },
          dispute: {
            select: {
              id: true,
              phase: true,
              status: true,
              refundAmount: true,
              warrantyRejectedAt: true,
              warrantyDeadline: true,
            },
          },
        },
      },
    },
  });

  const now = new Date();
  const rows = orders.flatMap((order) =>
    order.items.map((item) => {
      // Tính SẴN Ở SERVER (so hạn bảo hành với giờ server) xem buyer đã được
      // escalate lên sàn chưa — tránh lệch giờ server/client. Phần B #8.
      const d = item.dispute;
      const rejected = Boolean(d?.warrantyRejectedAt);
      const deadlinePassed = d?.warrantyDeadline ? d.warrantyDeadline <= now : false;
      // Cửa sổ khiếu nại "bảo hành sau giải ngân" — NGUỒN SỰ THẬT DUY NHẤT
      // dùng chung với POST /api/disputes (src/lib/warranty.ts). Chỉ áp dụng
      // cho đơn đã RELEASED và CHƯA có khiếu nại nào.
      const remaining = warrantyRemaining({
        warrantyHours: item.warrantyHours,
        receivedAt: item.receivedAt,
        warrantyExpiresAt: item.warrantyExpiresAt,
        releasedAt: item.releasedAt,
      });
      const canOpenPostReleaseWarranty = item.status === "RELEASED" && !d && remaining.state === "active";
      // Đặt trước CHƯA ĐƯỢC GIAO — seller chưa set deliveredPayload. Không
      // có gì để lộ hàng, và buyer còn được huỷ bất kỳ lúc nào (xem
      // CancelPreOrderButton) — hoàn toàn khác với đơn đã giao/đơn thường.
      const isUndeliveredPreOrder = item.isPreOrder && item.deliveredPayload === null;
      const canCancelPreOrder = isUndeliveredPreOrder && item.status === "ESCROW";
      // Còn CẦN nút lộ hàng để "nhận hàng" hay không — sản phẩm THẬT SỰ có
      // bảo hành (warrantyHours > 0, không phải bán đứt/đơn cũ chưa
      // snapshot), buyer chưa từng bấm, đơn còn ở trạng thái hợp lệ để xác
      // nhận, VÀ (nếu là đặt trước) đã thực sự được giao — KHÔNG cho lộ hàng
      // trên 1 đơn đặt trước chưa có gì để giao (chặn "nhận hàng khống",
      // route reveal-delivered cũng tự chặn lại lần nữa ở server). KHÔNG còn
      // nút "Xác nhận đã nhận hàng" riêng — bấm nút lộ hàng
      // (DeliveredPayloadButton) LẦN ĐẦU giờ tự làm luôn việc này (xem
      // POST /api/orders/[orderItemId]/reveal-delivered), kể cả dịch vụ
      // không có nội dung gì để hiện.
      const canReveal =
        item.warrantyHours !== null &&
        item.warrantyHours > 0 &&
        !item.receivedAt &&
        (item.status === "ESCROW" || item.status === "RELEASED") &&
        !isUndeliveredPreOrder;
      return {
        orderId: order.id,
        orderCode: order.orderCode,
        itemId: item.id,
        productName: item.productName,
        variantLabel: item.variantLabel,
        imageUrl: item.product?.imageUrl ?? null,
        categorySlug: item.product?.category.slug ?? "",
        quantity: item.quantity,
        seller: item.product?.seller.shopName ?? "—",
        createdAt: order.createdAt,
        total: item.price * item.quantity,
        status: item.status as OrderStatus,
        escrowReleaseAt: item.escrowReleaseAt,
        hasDispute: Boolean(d),
        canOpenPostReleaseWarranty,
        canReveal,
        isUndeliveredPreOrder,
        canCancelPreOrder,
        deliveryDeadline: item.deliveryDeadline,
        // true = OrderItem.receivedAt đã set từ trước — dùng để báo cho
        // DeliveredPayloadButton biết KHÔNG hiện dòng cảnh báo "bấm = tính
        // đã nhận hàng" khi buyer chỉ đang xem lại.
        alreadyReceived: item.receivedAt !== null,
        // Nhãn đếm ngược "Còn X ngày Y giờ bảo hành" — null khi không có gì
        // để hiện (bán đứt/đơn cũ chưa release). Tính SẴN Ở SERVER cùng
        // `now` đã chốt phía trên, tránh lệch giờ server/client.
        warrantyLabel: formatWarrantyRemaining(remaining),
        dispute: d
          ? {
              id: d.id,
              phase: d.phase as "SELLER_WARRANTY" | "PLATFORM" | "POST_RELEASE_WARRANTY",
              status: d.status as DisputeStatus,
              refundAmount: d.refundAmount,
              rejected,
              canEscalate: d.phase === "SELLER_WARRANTY" && (rejected || deadlinePassed),
              deadlineText: d.warrantyDeadline
                ? d.warrantyDeadline.toLocaleString("vi-VN")
                : null,
            }
          : null,
        // KHÔNG gửi deliveredPayload/deliveredExpiresAt thẳng trong SSR nữa —
        // nội dung tài khoản/mật khẩu chỉ trả về khi buyer thực sự bấm "Xem"
        // qua POST /api/orders/[itemId]/reveal-delivered (ghi log mỗi lần
        // xem). AUDIT LỊCH SỬ ĐƠN HÀNG — LỖ HỔNG 2.
        hasDeliveredPayload: item.deliveredPayload !== null,
        // TUT_TRICK: nội dung hướng dẫn nhiều đoạn — DeliveredPayloadButton
        // hiện dạng khối văn bản đầy đủ thay vì chip credential 1 dòng.
        isTutTrick: item.product?.productType === "TUT_TRICK",
        // TOOL: quy trình sử dụng + credential đã giải mã, hiện cả 2 trong
        // cùng 1 panel (xem DeliveredPayloadButton mode="tool").
        isTool: item.product?.productType === "TOOL",
      };
    })
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
            <div className="mb-6">
              <h1 className="flex items-center gap-2 text-xl font-black text-foreground">
                <PackageSearch className="h-5 w-5 text-brand-dark" /> Lịch sử đơn hàng
              </h1>
              <p className="mt-1 text-sm text-muted">{rows.length} đơn hàng đã đặt trên MarketMMO.</p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            {rows.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border-c bg-surface px-6 py-16 text-center shadow-sm">
                <span className="grid h-20 w-20 place-items-center rounded-full bg-brand-light/40 ring-1 ring-brand-dark/20">
                  <PackageSearch className="h-9 w-9 text-brand-dark" strokeWidth={1.5} />
                </span>
                <div>
                  <p className="text-base font-bold text-foreground">Bạn chưa có đơn hàng nào</p>
                  <p className="mt-1 text-sm text-muted">
                    Khám phá hàng ngàn sản phẩm số và bắt đầu mua sắm ngay.
                  </p>
                </div>
                <Link
                  href="/"
                  className="mt-2 flex items-center gap-1.5 rounded-full bg-brand px-6 py-3 text-sm font-black text-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md"
                >
                  Tiếp tục mua sắm
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {rows.map((row) => (
                  <div
                    key={row.itemId}
                    className="rounded-2xl border border-border-c bg-surface p-4 shadow-sm transition-all duration-300 hover:border-brand-dark/50 hover:shadow-[0_12px_28px_rgba(224,196,0,0.12),0_4px_10px_rgba(0,0,0,0.04)] sm:p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-c pb-3">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs font-bold text-foreground">{row.orderCode}</span>
                        <CopyOrderCodeButton code={row.orderCode} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted">{row.createdAt.toLocaleString("vi-VN")}</span>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${statusStyle[row.status]}`}
                        >
                          {orderStatusLabel[row.status]}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-3.5">
                      <ProductThumbnail
                        imageUrl={row.imageUrl}
                        categorySlug={row.categorySlug}
                        boxClassName="h-24 w-24 shrink-0 rounded-xl bg-surface-alt ring-1 ring-border-c sm:h-28 sm:w-28"
                        iconClassName="h-9 w-9 text-foreground/60 sm:h-10 sm:w-10"
                        sizes="112px"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-bold leading-snug text-foreground sm:text-base">
                          {row.productName}
                        </p>
                        {row.variantLabel && (
                          <span className="mt-1.5 inline-block truncate rounded-full bg-brand-light/50 px-2 py-0.5 text-[11px] font-bold text-brand-dark">
                            {row.variantLabel}
                          </span>
                        )}
                        <p className="mt-1.5 truncate text-xs text-muted">
                          Người bán: <span className="font-semibold text-foreground/80">{row.seller}</span>
                        </p>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs text-muted">
                            Số lượng: <span className="font-semibold text-foreground">{row.quantity}</span>
                          </span>
                          <p className="text-base font-black text-danger sm:text-lg">{formatVnd(row.total)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3.5 flex flex-col items-start gap-1.5 border-t border-border-c pt-3.5">
                      {/* Ẩn nút xem khi đơn đã HOÀN TOÀN BỘ tiền (status
                          CANCELLED — nguồn duy nhất là full refund khiếu
                          nại). Buyer đã nhận lại 100% thì không còn quyền
                          xem/copy tiếp — quyết định (a), SECURITY_AUDIT #8,
                          nay enforce luôn ở server (xem reveal-delivered).
                          Hiện nút khi CÓ nội dung để xem (hasDeliveredPayload)
                          HOẶC còn cần xác nhận nhận hàng (canReveal, vd
                          dịch vụ không có nội dung tự động) — bấm nút này
                          LÀ hành động "nhận hàng" duy nhất trên toàn sàn,
                          thay hẳn nút "Xác nhận đã nhận hàng" cũ. */}
                      {row.isUndeliveredPreOrder && row.status !== "CANCELLED" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-info/10 px-2 py-0.5 text-[10px] font-bold text-info">
                          ĐẶT TRƯỚC — chờ người bán giao
                        </span>
                      )}
                      {(row.hasDeliveredPayload || row.canReveal) && row.status !== "CANCELLED" && (
                        <DeliveredPayloadButton
                          orderItemId={row.itemId}
                          mode={row.isTutTrick ? "guide" : row.isTool ? "tool" : "credential"}
                          alreadyReceived={row.alreadyReceived}
                        />
                      )}
                      {/* Đếm ngược thời gian bảo hành — hiện bất kể ESCROW/
                          RELEASED (mốc receivedAt độc lập với việc admin đã
                          giải ngân hay chưa), null khi bán đứt/đơn cũ. */}
                      {row.warrantyLabel && (
                        <p
                          className={`text-[10px] font-semibold ${
                            row.warrantyLabel.tone === "danger"
                              ? "text-danger"
                              : row.warrantyLabel.tone === "warn"
                                ? "text-brand-dark"
                                : "text-muted"
                          }`}
                        >
                          {row.warrantyLabel.label}
                        </p>
                      )}
                      {row.status === "ESCROW" && row.canCancelPreOrder && (
                        <>
                          <p className="text-[10px] font-semibold text-brand-dark">
                            {row.deliveryDeadline && row.deliveryDeadline > new Date()
                              ? `Người bán còn hạn giao đến ${row.deliveryDeadline.toLocaleString("vi-VN")}`
                              : "Đã quá hạn giao — hệ thống sẽ tự động hoàn tiền"}
                          </p>
                          <CancelPreOrderButton orderItemId={row.itemId} />
                        </>
                      )}
                      {row.status === "ESCROW" && !row.canCancelPreOrder && (
                        <>
                          <p className="text-[10px] text-muted">
                            Giải ngân: {row.escrowReleaseAt.toLocaleDateString("vi-VN")}
                          </p>
                          {!row.hasDispute && <OpenDisputeButton orderItemId={row.itemId} />}
                        </>
                      )}
                      {row.status === "DISPUTED" && row.dispute && (
                        <DisputeStatusCell
                          disputeId={row.dispute.id}
                          phase={row.dispute.phase as "SELLER_WARRANTY" | "PLATFORM"}
                          rejected={row.dispute.rejected}
                          canEscalate={row.dispute.canEscalate}
                          deadlineText={row.dispute.deadlineText}
                        />
                      )}
                      {/* Bảo hành sau giải ngân — đơn ĐÃ RELEASED (tiền vào ví
                          seller), buyer vẫn còn trong "Thời gian bảo hành"
                          (xem warrantyLabel ở trên) và chưa mở khiếu nại nào. */}
                      {row.status === "RELEASED" && row.canOpenPostReleaseWarranty && (
                        <OpenDisputeButton orderItemId={row.itemId} variant="post_release" />
                      )}
                      {row.status === "RELEASED" &&
                        row.dispute &&
                        row.dispute.phase === "POST_RELEASE_WARRANTY" && (
                          <PostReleaseDisputeStatus
                            disputeId={row.dispute.id}
                            status={row.dispute.status}
                            refundAmount={row.dispute.refundAmount}
                          />
                        )}
                      <OrderStatusTimeline orderItemId={row.itemId} />
                    </div>
                  </div>
                ))}
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
  robots: PRIVATE_ROBOTS,
};
