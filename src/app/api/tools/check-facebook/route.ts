import { NextResponse } from "next/server";

const MAX_TARGETS = 10;
const FETCH_TIMEOUT_MS = 8000;

const ALLOWED_HOSTS = new Set([
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "web.facebook.com",
  "mbasic.facebook.com",
]);

const USERNAME_RE = /^[A-Za-z0-9.\-_]{2,80}$/;

type CheckStatus = "not_found" | "checkpoint" | "maybe_live" | "invalid" | "error";

function resolveProfileUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed) || trimmed.toLowerCase().includes("facebook.com")) {
    try {
      const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      const url = new URL(withScheme);
      if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) return null;
      url.protocol = "https:";
      url.hostname = "www.facebook.com";
      return url;
    } catch {
      return null;
    }
  }

  const username = trimmed.replace(/^@/, "");
  if (!USERNAME_RE.test(username)) return null;
  return new URL(`https://www.facebook.com/${username}`);
}

const NOT_FOUND_SIGNALS = [
  "this content isn't available",
  "sorry, this content isn't available",
  "nội dung này hiện không có",
  "trang bạn yêu cầu không có ở đây",
  "content not found",
  "page not found",
  "trang không tồn tại",
];

const BLOCK_SIGNALS = [
  "sorry, something went wrong",
  "we're working on getting this fixed",
  "error facebook",
];

const CHECKPOINT_SIGNALS = [
  "xác nhận danh tính",
  "confirm your identity",
  "tài khoản của bạn đã bị vô hiệu hoá",
  "tài khoản của bạn đã bị vô hiệu hóa",
  "your account has been disabled",
  "checkpoint",
];

async function checkProfile(url: URL): Promise<{ status: CheckStatus; detail: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });

    const finalHost = new URL(res.url).hostname.toLowerCase();
    if (!finalHost.endsWith("facebook.com")) {
      return { status: "error", detail: "Facebook chuyển hướng bất thường, không xác định được." };
    }

    if (res.status === 404) {
      return { status: "not_found", detail: "Facebook trả về 404 — link/hồ sơ không tồn tại." };
    }

    // Facebook chặn phần lớn request tự động (không phải trình duyệt thật) bằng
    // một trang lỗi chung "Sorry, something went wrong" (thường HTTP 400) — trang
    // này hiện ra giống hệt nhau cho CẢ hồ sơ đang tồn tại lẫn không tồn tại, nên
    // không được coi đây là tín hiệu "còn sống": phải báo "không xác định được".
    if (res.status !== 200) {
      return {
        status: "error",
        detail: `Facebook chặn truy cập tự động (HTTP ${res.status}) — không xác định được, hãy kiểm tra lại bằng trình duyệt thật.`,
      };
    }

    const html = (await res.text()).toLowerCase();

    if (BLOCK_SIGNALS.some((s) => html.includes(s))) {
      return {
        status: "error",
        detail: "Facebook chặn truy cập tự động — không xác định được, hãy kiểm tra lại bằng trình duyệt thật.",
      };
    }
    if (NOT_FOUND_SIGNALS.some((s) => html.includes(s))) {
      return { status: "not_found", detail: "Facebook báo nội dung không tồn tại hoặc đã bị xoá." };
    }
    if (CHECKPOINT_SIGNALS.some((s) => html.includes(s))) {
      return {
        status: "checkpoint",
        detail: "Có dấu hiệu tài khoản bị khoá / yêu cầu xác minh danh tính.",
      };
    }
    return {
      status: "maybe_live",
      detail: "Không phát hiện dấu hiệu bị khoá/xoá (Facebook có thể ẩn nội dung với khách vãng lai).",
    };
  } catch {
    return { status: "error", detail: "Không kết nối được tới Facebook (timeout hoặc bị chặn)." };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const targets = body?.targets;

  if (!Array.isArray(targets) || targets.length === 0) {
    return NextResponse.json(
      { error: "Vui lòng nhập ít nhất một link hoặc username Facebook." },
      { status: 400 }
    );
  }
  if (targets.length > MAX_TARGETS) {
    return NextResponse.json(
      { error: `Chỉ kiểm tra tối đa ${MAX_TARGETS} tài khoản mỗi lần.` },
      { status: 400 }
    );
  }

  const results = await Promise.all(
    targets.slice(0, MAX_TARGETS).map(async (raw: unknown) => {
      const input = String(raw ?? "").slice(0, 200);
      const url = resolveProfileUrl(input);
      if (!url) {
        return {
          input,
          status: "invalid" as const,
          detail: "Link hoặc username Facebook không hợp lệ.",
        };
      }
      const { status, detail } = await checkProfile(url);
      return { input, status, detail, url: url.toString() };
    })
  );

  return NextResponse.json({ results });
}
