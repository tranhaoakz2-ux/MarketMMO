import crypto from "crypto";

/**
 * Minimal VNPay "Payment URL" (pay via redirect) integration per the public
 * VNPay merchant spec: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 *
 * Requires VNPAY_TMN_CODE + VNPAY_HASH_SECRET (merchant credentials, issued
 * by VNPay after business registration) — see .env.example. Without them,
 * `isVnpayConfigured()` returns false and callers should fall back to the
 * manual deposit-request flow.
 *
 * Chữ ký HMAC bắt buộc encode theo đúng mẫu Node.js chính thức của VNPay:
 * mã hoá key/value bằng encodeURIComponent RỒI thay "%20" thành "+" (kiểu
 * application/x-www-form-urlencoded, không phải RFC 3986 thuần) trước khi
 * sort và nối chuỗi. Dùng encodeURIComponent thường (giữ "%20") sẽ cho ra
 * chữ ký SAI với server VNPay bất kỳ khi nào field có khoảng trắng (vd
 * orderInfo) — lỗi thật đã phát hiện khi rà lại code trước khi dùng key thật.
 */

export function isVnpayConfigured(): boolean {
  return Boolean(process.env.VNPAY_TMN_CODE && process.env.VNPAY_HASH_SECRET);
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

export function createVnpayPaymentUrl(params: {
  amount: number;
  txnRef: string;
  orderInfo: string;
  ipAddr: string;
}): string {
  const tmnCode = process.env.VNPAY_TMN_CODE;
  const secret = process.env.VNPAY_HASH_SECRET;
  if (!tmnCode || !secret) {
    throw new Error("VNPay chưa được cấu hình (thiếu VNPAY_TMN_CODE/VNPAY_HASH_SECRET).");
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

export function verifyVnpayReturn(query: Record<string, string>): boolean {
  const secret = process.env.VNPAY_HASH_SECRET;
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
