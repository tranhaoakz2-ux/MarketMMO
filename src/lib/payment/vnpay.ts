import crypto from "crypto";
import { getPaymentConfig } from "@/lib/payment/config";

/**
 * Minimal VNPay "Payment URL" (pay via redirect) integration per the public
 * VNPay merchant spec: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 *
 * Requires vnpay_tmn_code + vnpay_hash_secret (merchant credentials, issued
 * by VNPay after business registration) — quản lý qua /admin/cai-dat, fallback
 * .env (VNPAY_TMN_CODE/VNPAY_HASH_SECRET) nếu admin chưa cấu hình qua DB, xem
 * src/lib/payment/config.ts. Thiếu cả 2 nguồn thì `isVnpayConfigured()` trả
 * false và callers nên fallback sang luồng yêu cầu nạp tiền thủ công.
 *
 * Chữ ký HMAC bắt buộc encode theo đúng mẫu Node.js chính thức của VNPay:
 * mã hoá key/value bằng encodeURIComponent RỒI thay "%20" thành "+" (kiểu
 * application/x-www-form-urlencoded, không phải RFC 3986 thuần) trước khi
 * sort và nối chuỗi. Dùng encodeURIComponent thường (giữ "%20") sẽ cho ra
 * chữ ký SAI với server VNPay bất kỳ khi nào field có khoảng trắng (vd
 * orderInfo) — lỗi thật đã phát hiện khi rà lại code trước khi dùng key thật.
 */

// KILL-SWITCH: VNPay đã ngừng hỗ trợ trên sàn (dùng chuyển khoản ngân hàng
// qua SePay + USDT thay thế) — cờ CỐ Ý luôn true, ĐỘC LẬP với việc admin/env
// có điền vnpay_tmn_code/vnpay_hash_secret hay không, để tính năng không thể
// vô tình "sống lại" nếu sau này ai đó điền key thật vào mà không biết VNPay
// đã bị tắt chủ ý. Đổi false (và bỏ dòng return sớm bên dưới) nếu sau này
// quyết định bật lại VNPay — code tích hợp (chữ ký, create/ipn/return) vẫn
// giữ nguyên, không xoá.
export const VNPAY_DISABLED = true;

export async function isVnpayConfigured(): Promise<boolean> {
  if (VNPAY_DISABLED) return false;
  const [tmnCode, secret] = await Promise.all([
    getPaymentConfig("vnpay_tmn_code"),
    getPaymentConfig("vnpay_hash_secret"),
  ]);
  return Boolean(tmnCode && secret);
}

function vnpEncode(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, "+");
}

/** Sắp xếp theo key rồi nối thành chuỗi ký (và cũng dùng được làm query string). */
function buildSignData(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((key) => `${key}=${vnpEncode(params[key])}`)
    .join("&");
}

function formatVnpayDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export async function createVnpayPaymentUrl(params: {
  amount: number;
  txnRef: string;
  orderInfo: string;
  ipAddr: string;
}): Promise<string> {
  const [tmnCode, secret] = await Promise.all([
    getPaymentConfig("vnpay_tmn_code"),
    getPaymentConfig("vnpay_hash_secret"),
  ]);
  if (!tmnCode || !secret) {
    throw new Error("VNPay chưa được cấu hình (thiếu mã TMN/hash secret).");
  }

  const vnpUrl =
    process.env.VNPAY_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
  const returnUrl =
    process.env.VNPAY_RETURN_URL || "http://localhost:3000/api/payment/vnpay/return";

  const vnpParams: Record<string, string> = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Locale: "vn",
    vnp_CurrCode: "VND",
    vnp_TxnRef: params.txnRef,
    vnp_OrderInfo: params.orderInfo,
    vnp_OrderType: "other",
    vnp_Amount: String(Math.round(params.amount * 100)),
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: params.ipAddr,
    vnp_CreateDate: formatVnpayDate(new Date()),
  };

  const signData = buildSignData(vnpParams);
  const secureHash = crypto
    .createHmac("sha512", secret)
    .update(Buffer.from(signData, "utf-8"))
    .digest("hex");

  return `${vnpUrl}?${signData}&vnp_SecureHash=${secureHash}`;
}

export async function verifyVnpayReturn(query: Record<string, string>): Promise<boolean> {
  const secret = await getPaymentConfig("vnpay_hash_secret");
  if (!secret) return false;

  const { vnp_SecureHash, vnp_SecureHashType, ...rest } = query;
  void vnp_SecureHashType;
  const signData = buildSignData(rest);
  const expected = crypto
    .createHmac("sha512", secret)
    .update(Buffer.from(signData, "utf-8"))
    .digest("hex");

  return Boolean(vnp_SecureHash) && expected === vnp_SecureHash;
}
