import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

// Thư mục lưu ảnh CCCD / đính kèm chat khi chạy ở chế độ ổ đĩa cục bộ (dev
// hoặc host có filesystem lâu dài) — NGOÀI /public (không public như logo/
// ảnh sản phẩm), chỉ đọc được qua route được bảo vệ (xác thực quyền xem
// trước khi trả file). Xem .gitignore — thư mục này không commit.
const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Định dạng file (không phải ảnh) được phép đính kèm trong chat — cố tình
// CHỈ cho phép định dạng tài liệu thông dụng, chặn mọi thứ giống file thực
// thi (exe/sh/bat/js...) để tránh chat trở thành kênh phát tán mã độc.
const ALLOWED_DOC_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
  "text/plain": "txt",
};

export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB — ảnh (CCCD, chat)
export const MAX_CHAT_FILE_SIZE = 10 * 1024 * 1024; // 10MB — file đính kèm chat

export function isAllowedImageType(mimeType: string): boolean {
  return mimeType in ALLOWED_TYPES;
}

function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

// Lưu file: dùng Vercel Blob nếu có BLOB_READ_WRITE_TOKEN — bắt buộc khi
// deploy lên Vercel vì filesystem trong môi trường serverless không lưu trữ
// lâu dài (mỗi request/instance có thể chạy trên máy chủ khác, file ghi vào
// ổ đĩa cục bộ dễ biến mất). Thiếu token (dev local không cấu hình Blob) thì
// tự động rơi về ghi ổ đĩa cục bộ như trước — cùng quy ước env-var-gated đã
// dùng cho VNPay/Telegram/Resend trong dự án. Trả về giá trị lưu vào DB:
// URL đầy đủ (Blob) hoặc đường dẫn tương đối (ổ đĩa), phân biệt bằng tiền tố
// "http" khi đọc lại (xem readUploadedFile()).
async function saveBuffer(
  relativePath: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  if (isBlobConfigured()) {
    const blob = await put(relativePath, buffer, {
      access: "public",
      contentType,
      addRandomSuffix: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  }

  const absolutePath = path.join(UPLOAD_ROOT, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);
  return relativePath;
}

/** Lưu file CCCD, trả về giá trị lưu vào DB (URL Blob hoặc đường dẫn tương đối). */
export async function saveVerificationImage(
  sellerId: string,
  side: "front" | "back",
  file: File
): Promise<string> {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new Error("Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.");
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    throw new Error("Ảnh vượt quá 5MB.");
  }

  const relativePath = path.join("cccd", sellerId, `${side}.${ext}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  return saveBuffer(relativePath, buffer, file.type);
}

/**
 * Lưu ảnh/file đính kèm 1 tin nhắn chat. Tự phân loại IMAGE (ALLOWED_TYPES)
 * hay FILE (ALLOWED_DOC_TYPES) theo mimeType client gửi lên, dùng đúng sàn
 * dung lượng của loại đó — từ chối mọi định dạng khác (bao gồm mọi file
 * thực thi). Tên file lưu dùng UUID ngẫu nhiên (không dùng tên gốc người
 * dùng đặt) để tránh path traversal/trùng tên; tên gốc vẫn lưu riêng vào DB
 * (`attachmentName`) để hiển thị lại đúng cho người nhận.
 */
export async function saveChatAttachment(
  conversationId: string,
  file: File
): Promise<{ path: string; type: "IMAGE" | "FILE"; name: string }> {
  const isImage = file.type in ALLOWED_TYPES;
  const isDoc = file.type in ALLOWED_DOC_TYPES;
  if (!isImage && !isDoc) {
    throw new Error("Định dạng file không được hỗ trợ.");
  }

  const maxSize = isImage ? MAX_UPLOAD_SIZE : MAX_CHAT_FILE_SIZE;
  if (file.size > maxSize) {
    throw new Error(`File vượt quá ${Math.round(maxSize / 1024 / 1024)}MB.`);
  }

  const ext = isImage ? ALLOWED_TYPES[file.type] : ALLOWED_DOC_TYPES[file.type];
  const relativePath = path.join("chat", conversationId, `${randomUUID()}.${ext}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  const storedPath = await saveBuffer(relativePath, buffer, file.type);

  return { path: storedPath, type: isImage ? "IMAGE" : "FILE", name: file.name.slice(0, 200) };
}

/**
 * Đọc lại nội dung file đã lưu — nhận diện Blob URL (tiền tố http) hay đường
 * dẫn ổ đĩa cục bộ. Trả về `Uint8Array` (không phải `Buffer`) vì cài
 * `@vercel/blob` kéo theo `undici`, gói này tự khai báo lại kiểu toàn cục
 * `BodyInit`/`Response` khiến `Buffer` (kiểu Node) không còn được TypeScript
 * coi là tương thích khi truyền thẳng vào `new NextResponse(buffer, ...)` —
 * `Uint8Array` (kiểu chuẩn DOM, không bị ảnh hưởng) tránh xung đột này mà
 * không cần đụng vào cấu hình global type.
 */
export async function readUploadedFile(storedPath: string): Promise<Uint8Array> {
  if (storedPath.startsWith("http://") || storedPath.startsWith("https://")) {
    const res = await fetch(storedPath);
    if (!res.ok) throw new Error("Không tìm thấy file.");
    return new Uint8Array(await res.arrayBuffer());
  }
  return new Uint8Array(await readFile(path.join(UPLOAD_ROOT, storedPath)));
}

export function contentTypeForPath(storedPath: string): string {
  const ext = path.extname(storedPath).slice(1).toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "pdf") return "application/pdf";
  if (ext === "doc") return "application/msword";
  if (ext === "docx")
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "xls") return "application/vnd.ms-excel";
  if (ext === "xlsx")
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (ext === "zip") return "application/zip";
  if (ext === "txt") return "text/plain";
  return "application/octet-stream";
}
