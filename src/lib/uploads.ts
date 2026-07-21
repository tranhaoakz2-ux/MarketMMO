import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { get, put } from "@vercel/blob";

// Thư mục lưu file đính kèm chat khi chạy ở chế độ ổ đĩa cục bộ (dev hoặc
// host có filesystem lâu dài) — NGOÀI /public (không public như logo/ảnh sản
// phẩm), chỉ đọc được qua route được bảo vệ (xác thực quyền xem trước khi
// trả file). Xem .gitignore — thư mục này không commit.
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

export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB — ảnh (sản phẩm, chat)
export const MAX_CHAT_FILE_SIZE = 10 * 1024 * 1024; // 10MB — file đính kèm chat

export function isAllowedImageType(mimeType: string): boolean {
  return mimeType in ALLOWED_TYPES;
}

// Nhận diện loại file THẬT theo magic-byte (chữ ký ở đầu file) — KHÔNG tin
// file.type client gửi (client có thể khai gian image/png cho 1 file HTML/thực
// thi). Trả "family" để đối chiếu với loại khai báo. txt không có magic đáng
// tin cậy nên xử lý riêng (bỏ qua kiểm, chỉ là text thuần, phục vụ text/plain).
type FileFamily = "jpg" | "png" | "webp" | "pdf" | "zip" | "ole";

function startsWith(buf: Uint8Array, sig: number[], offset = 0): boolean {
  if (buf.length < offset + sig.length) return false;
  for (let i = 0; i < sig.length; i++) if (buf[offset + i] !== sig[i]) return false;
  return true;
}

function detectFamily(buf: Uint8Array): FileFamily | null {
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return "jpg";
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  // WebP: "RIFF"....(4 byte size)...."WEBP"
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) return "webp";
  if (startsWith(buf, [0x25, 0x50, 0x44, 0x46])) return "pdf"; // %PDF
  if (startsWith(buf, [0x50, 0x4b, 0x03, 0x04])) return "zip"; // PK.. (docx/xlsx/zip)
  if (startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return "ole"; // doc/xls cũ
  return null;
}

// Loại MIME khai báo -> family magic-byte hợp lệ (txt = bỏ qua kiểm magic).
const EXPECTED_FAMILY: Record<string, FileFamily | "text"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/msword": "ole",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "zip",
  "application/vnd.ms-excel": "ole",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "zip",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
  "text/plain": "text",
};

// Ném lỗi nếu nội dung THẬT không khớp loại khai báo (chống upload polyglot/
// giả mạo Content-Type). Gọi sau khi đã đọc buffer.
function assertMagicMatches(mimeType: string, buf: Uint8Array): void {
  const expected = EXPECTED_FAMILY[mimeType];
  if (!expected) throw new Error("Định dạng file không được hỗ trợ.");
  if (expected === "text") return; // txt: không có magic-byte, chấp nhận
  if (detectFamily(buf) !== expected) {
    throw new Error("Nội dung file không khớp định dạng khai báo (nghi giả mạo).");
  }
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
// Lưu file đính kèm CHAT — RIÊNG TƯ. Khi có Blob: dùng access "private" (chỉ đọc
// được qua get() kèm token phía server), giá trị lưu DB có tiền tố "blob:" +
// pathname để readUploadedFile() biết đọc bằng get() thay vì fetch công khai.
// Khi không có Blob (dev local): ghi ổ đĩa NGOÀI /public, trả đường dẫn tương đối.
// (Ảnh SẢN PHẨM công khai KHÔNG đi qua đây — xem saveProductImage.)
async function saveBuffer(
  relativePath: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  if (isBlobConfigured()) {
    const blob = await put(relativePath, buffer, {
      access: "private",
      contentType,
      addRandomSuffix: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    // Lưu pathname (không phải URL public) — đọc lại bằng get({access:"private"}).
    return `blob:${blob.pathname}`;
  }

  const absolutePath = path.join(UPLOAD_ROOT, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);
  return relativePath;
}

/**
 * Lưu ảnh sản phẩm — khác ảnh đính kèm chat ở chỗ đây là ảnh CÔNG KHAI (ai
 * cũng xem được, hiển thị ngay trên thẻ sản phẩm/trang chi tiết), không qua
 * route bảo vệ nào. Có Blob thì URL trả về đã public sẵn, dùng thẳng được
 * trong `<Image src=...>`. Thiếu Blob (dev local) thì ghi thẳng vào
 * `public/uploads/products/` (khác thư mục `/uploads` ở root dùng cho chat —
 * thư mục đó NGOÀI `/public`, không ai xem trực tiếp được) để Next.js tự
 * phục vụ như 1 static asset bình thường, trả về đường dẫn `/uploads/
 * products/<uuid>.<ext>` dùng thẳng luôn, không cần đọc lại qua
 * readUploadedFile()/route bảo vệ.
 */
export async function saveProductImage(file: File): Promise<string> {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new Error("Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.");
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    throw new Error("Ảnh vượt quá 5MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  assertMagicMatches(file.type, buffer); // chống giả mạo Content-Type
  const filename = `${randomUUID()}.${ext}`;

  if (isBlobConfigured()) {
    const blob = await put(path.join("products", filename), buffer, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  }

  const absolutePath = path.join(process.cwd(), "public", "uploads", "products", filename);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);
  return `/uploads/products/${filename}`;
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
  assertMagicMatches(file.type, buffer); // chống giả mạo Content-Type (polyglot/exe)
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
  // Blob RIÊNG TƯ (mới): tiền tố "blob:" + pathname — đọc bằng get() kèm token,
  // KHÔNG lộ URL ra ngoài. Chỉ route đã kiểm quyền mới gọi hàm này.
  if (storedPath.startsWith("blob:")) {
    const pathname = storedPath.slice("blob:".length);
    const result = await get(pathname, {
      access: "private",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    if (!result || !result.stream) throw new Error("Không tìm thấy file.");
    return new Uint8Array(await new Response(result.stream).arrayBuffer());
  }
  // Blob CÔNG KHAI cũ (dữ liệu chat lưu trước khi chuyển sang private) — vẫn
  // đọc được qua URL để không mất lịch sử; route vẫn kiểm quyền trước khi gọi.
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
